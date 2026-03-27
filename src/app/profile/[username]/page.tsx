import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import { Globe, Lock, List as ListIcon } from "lucide-react"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { GameLogGrid } from "@/components/profile/GameLogGrid"
import { FavoriteGames } from "@/components/profile/FavoriteGames"
import { SteamImports } from "@/components/profile/SteamImports"
import { SectionHeading } from "@/components/shared/SectionHeading"
import type { GameStatus, ListRow } from "@/types/database"

interface ProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params
  const description = `${username}'s gaming profile on HIGH-SCORE`
  return {
    title: `${username} — HIGH-SCORE`,
    description,
    openGraph: {
      title: `${username} — HIGH-SCORE`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${username} — HIGH-SCORE`,
      description,
    },
  }
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = await params
  const { status: statusFilter } = await searchParams
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username)
    .single()

  if (profileError || !profile) notFound()

  // Fetch total count + per-status counts in parallel
  const allStatuses = ["played", "playing", "completed", "backlog", "wishlist", "abandoned"] as const
  const [{ count: totalCount }, ...statusCountResults] = await Promise.all([
    supabase
      .from("game_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id),
    ...allStatuses.map(s =>
      supabase
        .from("game_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", s)
    ),
  ])
  const statusCounts: Record<string, number> = {}
  allStatuses.forEach((s, i) => {
    statusCounts[s] = statusCountResults[i].count ?? 0
  })

  const PAGE_SIZE = 40

  let logsQuery = supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", profile.id)
    .order("logged_date", { ascending: false })
    .limit(PAGE_SIZE)

  if (
    statusFilter &&
    ["played", "playing", "completed", "backlog", "wishlist", "abandoned"].includes(statusFilter)
  ) {
    logsQuery = logsQuery.eq("status", statusFilter as GameStatus)
  }

  const { data: logs } = await logsQuery

  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ])

  let isFollowing = false
  let isBlocked = false
  let isBlockedBy = false
  if (currentUser && currentUser.id !== profile.id) {
    const [{ data: followRow }, { data: blockedRow }, { data: blockedByRow }] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id)
        .single(),
      supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", currentUser.id)
        .eq("blocked_id", profile.id)
        .single(),
      supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", profile.id)
        .eq("blocked_id", currentUser.id)
        .single(),
    ])
    isFollowing = !!followRow
    isBlocked = !!blockedRow
    isBlockedBy = !!blockedByRow
  }

  const isOwn = currentUser?.id === profile.id

  // Compute rating distribution
  const ratingDist: Record<string, number> = {}
  for (let r = 0.5; r <= 5; r += 0.5) {
    ratingDist[r.toFixed(1)] = 0
  }
  for (const log of (logs ?? []) as any[]) {
    if (log.rating != null && log.rating > 0) {
      const key = log.rating.toFixed(1)
      ratingDist[key] = (ratingDist[key] ?? 0) + 1
    }
  }

  const stats = {
    gamesLogged: totalCount ?? 0,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  }

  let listsQuery = (supabase
    .from("lists")
    .select("*, list_items(game_id, position, games(cover_url))")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(6) as any)

  if (!isOwn) {
    listsQuery = listsQuery.eq("is_public", true)
  }

  const [{ data: rawLists }, { data: rawFavorites }, steamImportsRes] = await Promise.all([
    listsQuery,
    (supabase
      .from("favorite_games")
      .select("game_id, position, games(id, title, slug, cover_url)")
      .eq("user_id", profile.id)
      .order("position", { ascending: true })
      .limit(4) as any),
    // Fetch unreviewed Steam imports (only for own profile)
    isOwn
      ? (supabase
          .from("game_logs")
          .select("id, game_id, playtime_hours, games(id, title, slug, cover_url, release_year)")
          .eq("user_id", profile.id)
          .eq("import_source", "steam")
          .is("rating", null)
          .order("playtime_hours", { ascending: false })
          .limit(200) as any)
      : Promise.resolve({ data: [] }),
  ])
  const lists = (rawLists ?? []) as ListRow[]
  const favorites = (rawFavorites ?? []) as any[]
  const steamImports = (steamImportsRes.data ?? []) as any[]

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8">
      <ProfileHeader
        profile={profile}
        stats={stats}
        ratingDist={ratingDist}
        isOwn={isOwn}
        isFollowing={isFollowing}
        currentUserId={currentUser?.id ?? null}
        isBlocked={isBlocked}
        isBlockedBy={isBlockedBy}
      />

      {/* Hide profile content when blocked */}
      {(isBlocked || isBlockedBy) ? null : <>

      {/* Favorite Games + Rating Chart side by side */}
      <section className="mt-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:justify-between items-start">
          {/* Favorites — left */}
          {(favorites.length > 0 || isOwn) && (
            <div className="flex-shrink-0">
              <FavoriteGames
                favorites={favorites}
                isOwn={isOwn}
                userId={profile.id}
              />
            </div>
          )}

          {/* Rating chart — right, aligned with fav games height */}
          {(() => {
            const distEntries = Object.entries(ratingDist).sort(
              (a, b) => parseFloat(a[0]) - parseFloat(b[0])
            )
            const maxDist = Math.max(...distEntries.map(([, c]) => c), 1)
            const totalRated = distEntries.reduce((s, [, c]) => s + c, 0)
            if (totalRated === 0) return null
            return (
              <div className="w-full sm:w-64 self-stretch flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Ratings</span>
                  <span className="text-[11px] text-zinc-600 tabular-nums">{totalRated}</span>
                </div>
                <div className="flex items-end gap-[3px] flex-1 w-full">
                  {distEntries.map(([rating, count]) => (
                    <div key={rating} className="flex-1 flex flex-col items-center h-full justify-end group">
                      {count > 0 && (
                        <span className="text-[9px] text-zinc-500 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">{count}</span>
                      )}
                      <div
                        className="w-full bg-zinc-700 hover:bg-[#ff0055] transition-colors rounded-t-sm cursor-default"
                        style={{
                          height: count > 0 ? `${Math.max((count / maxDist) * 100, 6)}%` : "2px",
                          opacity: count > 0 ? 1 : 0.15,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[13px] font-bold text-zinc-600">½</span>
                  <div className="flex items-center gap-[1px]">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} viewBox="0 0 24 24" className="h-[9px] w-[9px]">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#52525b" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* Steam Imports — only visible to profile owner */}
      {isOwn && steamImports.length > 0 && (
        <SteamImports imports={steamImports} userId={profile.id} />
      )}

      <section className="mt-8">
        <GameLogGrid
          key={statusFilter ?? "__all__"}
          logs={(logs ?? []) as any}
          activeStatus={(statusFilter as GameStatus) ?? null}
          username={username}
          isOwn={isOwn}
          totalCount={totalCount ?? 0}
          statusCounts={statusCounts}
          userId={profile.id}
          hasMore={(logs?.length ?? 0) >= PAGE_SIZE}
          pageSize={PAGE_SIZE}
        />
      </section>

      {/* User Lists */}
      {lists.length > 0 && (
        <section className="mt-8">
          <SectionHeading title="Lists" moreHref="/lists" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => {
              const items = ((list as any).list_items ?? []) as { game_id: number; position: number; games: { cover_url: string | null } | null }[]
              const covers = items
                .sort((a, b) => a.position - b.position)
                .map(i => i.games?.cover_url)
                .filter(Boolean)
                .slice(0, 4) as string[]
              const itemCount = items.length

              return (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className="group rounded-lg border border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all overflow-hidden"
                >
                  {/* Cover mosaic */}
                  <div className="relative h-20 bg-zinc-800/50 overflow-hidden">
                    {covers.length > 0 ? (
                      <div className="flex h-full">
                        {covers.map((url, i) => (
                          <div key={i} className="relative flex-1 h-full">
                            <Image
                              src={url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="120px"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ListIcon className="h-6 w-6 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-zinc-200 group-hover:text-zinc-100 truncate transition-colors">
                        {list.title}
                      </span>
                      {list.is_public ? (
                        <Globe className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {itemCount > 0 && (
                        <span className="text-[11px] text-zinc-500">{itemCount} {itemCount === 1 ? "game" : "games"}</span>
                      )}
                      {list.description && (
                        <>
                          {itemCount > 0 && <span className="text-zinc-700 text-[11px]">&middot;</span>}
                          <p className="text-[11px] text-zinc-500 truncate">{list.description}</p>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      </>}
    </div>
  )
}

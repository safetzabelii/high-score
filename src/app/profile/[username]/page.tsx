import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Globe, Lock, List as ListIcon } from "lucide-react"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { GameLogGrid } from "@/components/profile/GameLogGrid"
import { FavoriteGames } from "@/components/profile/FavoriteGames"
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
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(6) as any)

  if (!isOwn) {
    listsQuery = listsQuery.eq("is_public", true)
  }

  const [{ data: rawLists }, { data: rawFavorites }] = await Promise.all([
    listsQuery,
    (supabase
      .from("favorite_games")
      .select("game_id, position, games(id, title, slug, cover_url)")
      .eq("user_id", profile.id)
      .order("position", { ascending: true })
      .limit(4) as any),
  ])
  const lists = (rawLists ?? []) as ListRow[]
  const favorites = (rawFavorites ?? []) as any[]

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

      {/* Favorite Games */}
      {(favorites.length > 0 || isOwn) && (
        <section className="mt-6 mb-8">
          <FavoriteGames
            favorites={favorites}
            isOwn={isOwn}
            userId={profile.id}
          />
        </section>
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
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="border-b border-zinc-800/50 pb-3 hover:border-zinc-600/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-zinc-200 truncate">{list.title}</span>
                  {list.is_public ? (
                    <Globe className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                  ) : (
                    <Lock className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                  )}
                </div>
                {list.description && (
                  <p className="text-[11px] text-zinc-500 truncate">{list.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      </>}
    </div>
  )
}

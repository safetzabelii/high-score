import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Globe, Lock, List as ListIcon, ArrowRight } from "lucide-react"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { GameLogGrid } from "@/components/profile/GameLogGrid"
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

  const { count: totalCount } = await supabase
    .from("game_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)

  let logsQuery = supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", profile.id)
    .order("logged_date", { ascending: false })

  if (
    statusFilter &&
    ["played", "playing", "backlog", "abandoned"].includes(statusFilter)
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
  if (currentUser && currentUser.id !== profile.id) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id)
      .single()
    isFollowing = !!followRow
  }

  const isOwn = currentUser?.id === profile.id

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

  const { data: rawLists } = await listsQuery
  const lists = (rawLists ?? []) as ListRow[]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <ProfileHeader
        profile={profile}
        stats={stats}
        isOwn={isOwn}
        isFollowing={isFollowing}
        currentUserId={currentUser?.id ?? null}
      />

      <section>
        <GameLogGrid
          logs={(logs ?? []) as any}
          activeStatus={(statusFilter as GameStatus) ?? null}
          username={username}
          isOwn={isOwn}
          totalCount={totalCount ?? 0}
        />
      </section>

      {/* User Lists */}
      {lists.length > 0 && (
        <section className="mt-8 pt-6 border-t border-zinc-800/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <ListIcon className="h-3.5 w-3.5" />
              Lists
            </h2>
            <Link
              href="/lists"
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4 hover:border-zinc-700/60 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-200 truncate">{list.title}</span>
                  {list.is_public ? (
                    <Globe className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                  ) : (
                    <Lock className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                  )}
                </div>
                {list.description && (
                  <p className="text-xs text-zinc-500 truncate">{list.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

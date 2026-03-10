import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Gamepad2, Users, TrendingUp } from "lucide-react"
import { LogGameButton } from "@/components/shared/LogGameButton"
import { FeedCard } from "@/components/feed/FeedCard"
import type { UserRow, GameLogRow, GameRow } from "@/types/database"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Get current user's profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  const displayName =
    profile?.display_name ??
    (user.user_metadata as Record<string, string> | null)?.username ??
    user.email?.split("@")[0] ??
    "there"

  // Get who the user follows
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)

  const followingIds = (following ?? []).map((f) => f.following_id)

  // Include current user's own activity in the feed
  const feedUserIds = [...followingIds, user.id]

  // Fetch recent game logs from followed users + self
  const { data: rawFeed } = await (supabase
    .from("game_logs")
    .select("*, users(*), games(*)")
    .in("user_id", feedUserIds)
    .order("created_at", { ascending: false })
    .limit(50) as any)

  type FeedRow = GameLogRow & { users: UserRow; games: GameRow }
  const feedLogs = (rawFeed ?? []) as FeedRow[]

  // Fetch like data for all feed log IDs
  const feedLogIds = feedLogs.filter((l) => l.users && l.games).map((l) => l.id)

  // Get like counts for each log
  const { data: likeCounts } = await (supabase
    .from("likes")
    .select("log_id")
    .in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]) as any)

  const likeCountMap = new Map<string, number>()
  for (const like of (likeCounts ?? []) as { log_id: string }[]) {
    likeCountMap.set(like.log_id, (likeCountMap.get(like.log_id) ?? 0) + 1)
  }

  // Get which logs the current user has liked
  const { data: userLikes } = await supabase
    .from("likes")
    .select("log_id")
    .eq("user_id", user.id)
    .in("log_id", feedLogIds.length > 0 ? feedLogIds : [""])

  const likedSet = new Set((userLikes ?? []).map((l) => l.log_id))

  // Shape feed entries for the FeedCard component
  const feedEntries = feedLogs
    .filter((log) => log.users && log.games)
    .map((log) => ({
      id: log.id,
      rating: log.rating,
      status: log.status,
      review_text: log.review_text,
      contains_spoilers: log.contains_spoilers,
      platforms: log.platforms,
      playtime_hours: log.playtime_hours,
      logged_date: log.logged_date,
      created_at: log.created_at,
      user_id: log.user_id,
      username: log.users.username,
      display_name: log.users.display_name,
      avatar_url: log.users.avatar_url,
      game_id: log.game_id,
      game_title: log.games.title,
      cover_url: log.games.cover_url,
      game_slug: log.games.slug,
      likeCount: likeCountMap.get(log.id) ?? 0,
      likedByMe: likedSet.has(log.id),
    }))

  // Fetch some popular games from our DB for the sidebar
  const { data: recentGames } = await (supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6) as any)

  const sidebarGames = (recentGames ?? []) as GameRow[]

  // Get user stats
  const { count: logCount } = await supabase
    .from("game_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main feed column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-50">
                Hey, {displayName}
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Your activity feed
              </p>
            </div>
            <LogGameButton />
          </div>

          {/* Feed */}
          {feedEntries.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
              <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
              <h3 className="text-lg font-medium text-zinc-300">
                Your feed is empty
              </h3>
              <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                Log a game or follow other players to see activity here.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <LogGameButton />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {feedEntries.map((entry) => (
                <FeedCard
                  key={entry.id}
                  entry={entry}
                  currentUserId={user.id}
                />
              ))}

              {feedEntries.length >= 50 && (
                <p className="text-center text-sm text-zinc-600 py-4">
                  Showing the latest 50 entries
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
          {/* Quick stats */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              Your Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-zinc-100 tabular-nums">
                  {logCount ?? 0}
                </p>
                <p className="text-xs text-zinc-500">Games</p>
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-100 tabular-nums">
                  {followingIds.length}
                </p>
                <p className="text-xs text-zinc-500">Following</p>
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-100 tabular-nums">
                  {followerCount ?? 0}
                </p>
                <p className="text-xs text-zinc-500">Followers</p>
              </div>
            </div>
            {profile && (
              <Link
                href={`/profile/${profile.username}`}
                className="mt-3 block text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View profile
              </Link>
            )}
          </div>

          {/* Recently added games */}
          {sidebarGames.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Recently Added
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {sidebarGames.map((game) => (
                  <Link
                    key={game.id}
                    href={`/game/${game.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-zinc-800 transition-transform group-hover:scale-105">
                      {game.cover_url ? (
                        <Image
                          src={game.cover_url}
                          alt={game.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-1 text-center text-[9px] text-zinc-600">
                          {game.title}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      {game.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

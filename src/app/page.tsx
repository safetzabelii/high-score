import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Gamepad2, User as UserIcon, MessageSquare, Heart } from "lucide-react"
import { HeartRatingDisplay } from "@/components/shared/StarRating"
import { LogGameButton } from "@/components/shared/LogGameButton"
import { InfiniteFeed } from "@/components/feed/InfiniteFeed"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { GameCover } from "@/components/shared/GameCover"
import { getPopularGames, shapeGame, warmGameCache } from "@/lib/igdb/fetch"
import { syncGamesToAlgolia } from "@/lib/igdb/algolia/client"
import type { UserRow, GameLogRow, GameRow } from "@/types/database"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [
    profileRes,
    followingRes,
    popularRaw,
    recentLogsRes,
    activeUsersRes,
    logCountRes,
    followerCountRes,
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    getPopularGames(12),
    (supabase.from("game_logs").select("game_id, games(*)").order("created_at", { ascending: false }).limit(30) as any),
    (supabase.rpc("get_active_users_fallback").limit(8) as any),
    supabase.from("game_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
  ])

  const profile = profileRes.data
  const displayName =
    profile?.display_name ??
    (user.user_metadata as Record<string, string> | null)?.username ??
    user.email?.split("@")[0] ??
    "there"

  const followingIds = (followingRes.data ?? []).map((f: { following_id: string }) => f.following_id)
  const feedUserIds = [...followingIds, user.id]

  const popularGames = popularRaw.map(shapeGame)

  // Fire-and-forget: warm the game cache + Algolia in parallel
  // These don't block the page render
  Promise.all([
    warmGameCache(popularGames).catch(() => {}),
    syncGamesToAlgolia(popularGames).catch(() => {}),
  ])

  const seenIds = new Set<number>()
  const trendingGames: GameRow[] = []
  for (const log of (recentLogsRes.data ?? []) as { game_id: number; games: GameRow }[]) {
    if (log.games && !seenIds.has(log.game_id)) {
      seenIds.add(log.game_id)
      trendingGames.push(log.games)
      if (trendingGames.length >= 8) break
    }
  }

  let usersToShow: (UserRow & { log_count?: number })[] = []
  if (activeUsersRes.data && activeUsersRes.data.length > 0) {
    usersToShow = activeUsersRes.data
  } else {
    const { data: recentUsers } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6)
    usersToShow = (recentUsers ?? []) as UserRow[]
  }

  const PAGE_SIZE = 20
  const { data: rawFeed } = await (supabase
    .from("game_logs")
    .select("*, users(*), games(*)")
    .in("user_id", feedUserIds)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1) as any)

  type FeedRow = GameLogRow & { users: UserRow; games: GameRow }
  const allFeedRows = (rawFeed ?? []) as FeedRow[]
  const hasMore = allFeedRows.length > PAGE_SIZE
  const feedLogs = hasMore ? allFeedRows.slice(0, PAGE_SIZE) : allFeedRows
  const feedLogIds = feedLogs.filter((l) => l.users && l.games).map((l) => l.id)

  const [likeCountsRes, userLikesRes, commentCountsRes] = await Promise.all([
    (supabase.from("likes").select("log_id").in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]) as any),
    supabase.from("likes").select("log_id").eq("user_id", user.id).in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]),
    (supabase.from("comments").select("log_id").in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]) as any),
  ])

  const likeCountMap = new Map<string, number>()
  for (const like of (likeCountsRes.data ?? []) as { log_id: string }[]) {
    likeCountMap.set(like.log_id, (likeCountMap.get(like.log_id) ?? 0) + 1)
  }
  const likedSet = new Set((userLikesRes.data ?? []).map((l: { log_id: string }) => l.log_id))
  const commentCountMap = new Map<string, number>()
  for (const c of (commentCountsRes.data ?? []) as { log_id: string }[]) {
    commentCountMap.set(c.log_id, (commentCountMap.get(c.log_id) ?? 0) + 1)
  }

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
      commentCount: commentCountMap.get(log.id) ?? 0,
    }))

  const initialCursor = hasMore ? feedLogs[feedLogs.length - 1].created_at : null
  const logCount = logCountRes.count ?? 0
  const followerCount = followerCountRes.count ?? 0
  const recentReviews = feedEntries.filter((e) => e.review_text && e.review_text.trim().length > 0).slice(0, 4)

  return (
    <div className="min-h-screen">
      {/* ─── Welcome — Letterboxd serif italic ───────────────── */}
      <div className="mx-auto max-w-[960px] px-4 pt-6 sm:pt-10 pb-4 sm:pb-6">
        <p className="font-serif text-base sm:text-xl text-zinc-300 italic">
          Welcome back, <span className="font-bold not-italic text-zinc-50">{displayName}</span>.
          {" "}Here&apos;s what your friends have been playing...
        </p>
      </div>

      <div className="mx-auto max-w-[960px] px-4">
        {/* ─── New From Community — poster strip ─────────────── */}
        {trendingGames.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="New from your community" />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {trendingGames.map((game) => (
                <GameCover
                  key={game.id}
                  slug={game.slug}
                  title={game.title}
                  coverUrl={game.cover_url}
                  size="md"
                  showTitle
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Popular This Week — grid ──────────────────────── */}
        {popularGames.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="Popular this week" moreHref="/discover" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
              {popularGames.slice(0, 8).map((game) => (
                <GameCover
                  key={game.id}
                  slug={game.slug}
                  title={game.title}
                  coverUrl={game.cover_url}
                  className="w-full"
                  showTitle
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Popular Reviews — 2-col Letterboxd style ─────── */}
        {recentReviews.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="Recent reviews" />
            <div className="grid gap-0 sm:grid-cols-2">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex gap-3 py-4 border-b border-zinc-700 sm:odd:pr-6 sm:even:pl-6 sm:even:border-l sm:even:border-zinc-700"
                >
                  <Link
                    href={`/game/${review.game_slug}`}
                    className="relative h-[105px] w-[70px] flex-shrink-0 overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover"
                  >
                    {review.cover_url && (
                      <Image
                        src={review.cover_url}
                        alt={review.game_title}
                        fill
                        className="object-cover"
                        sizes="70px"
                      />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/game/${review.game_slug}`}
                      className="font-serif text-base text-zinc-50 hover:text-hs-blue transition-colors leading-tight block"
                    >
                      {review.game_title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Link
                        href={`/profile/${review.username}`}
                        className="text-[11px] font-semibold text-zinc-300 hover:text-zinc-50 transition-colors"
                      >
                        {review.display_name || review.username}
                      </Link>
                      {review.rating != null && review.rating > 0 && (
                        <HeartRatingDisplay rating={review.rating} />
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] text-zinc-400 leading-relaxed line-clamp-3">
                      {review.review_text}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                      {review.likeCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {review.likeCount} {review.likeCount === 1 ? "like" : "likes"}
                        </span>
                      )}
                      {review.commentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {review.commentCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Feed + Sidebar — Letterboxd two-column ────────── */}
        <div className="flex flex-col lg:flex-row gap-10 pb-8">
          <div className="flex-1 min-w-0">
            <SectionHeading title="Friend activity" moreHref="/activity" moreLabel="All activity" />

            {feedEntries.length === 0 ? (
              <div className="py-16 text-center">
                <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
                <h3 className="text-base font-semibold text-zinc-300">Your feed is empty</h3>
                <p className="mt-1.5 text-sm text-zinc-500 max-w-xs mx-auto">
                  Follow players or log your first game to see activity here.
                </p>
                <div className="mt-5">
                  <LogGameButton />
                </div>
              </div>
            ) : (
              <InfiniteFeed
                initialEntries={feedEntries}
                initialCursor={initialCursor}
                currentUserId={user.id}
              />
            )}
          </div>

          {/* Sidebar — 230px like Letterboxd */}
          <aside className="w-full lg:w-[230px] flex-shrink-0 space-y-6">
            {profile && (
              <div>
                <div className="flex items-center gap-5 text-center">
                  <Link href={`/profile/${profile.username}`} className="group">
                    <p className="text-lg font-semibold text-zinc-100 group-hover:text-hs-blue transition-colors tabular-nums">{logCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Games</p>
                  </Link>
                  <div>
                    <p className="text-lg font-semibold text-zinc-100 tabular-nums">{followingIds.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Following</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-100 tabular-nums">{followerCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Followers</p>
                  </div>
                </div>
              </div>
            )}

            {usersToShow.length > 0 && (
              <div>
                <h3 className="section-heading mb-3">Popular members</h3>
                <div className="space-y-0.5">
                  {usersToShow.slice(0, 6).map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-2.5 rounded py-1.5 hover:bg-zinc-800/40 transition-colors -mx-1.5 px-1.5"
                    >
                      <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800">
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt={u.display_name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserIcon className="h-3 w-3 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-zinc-300 truncate">{u.display_name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-[11px] text-zinc-300 pt-2 border-t border-zinc-700">
              <div className="flex items-center gap-3 pt-3">
                <Link href="/stats" className="hover:text-zinc-400 transition-colors">Stats</Link>
                <Link href="/backlog" className="hover:text-zinc-400 transition-colors">Backlog</Link>
                <Link href="/lists" className="hover:text-zinc-400 transition-colors">Lists</Link>
                <Link href="/activity" className="hover:text-zinc-400 transition-colors">Activity</Link>
              </div>
              <p className="text-zinc-700">HIGH-SCORE &mdash; Track your games.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
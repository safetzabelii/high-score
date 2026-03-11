import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Gamepad2, Star, Users, User as UserIcon, ArrowRight, MessageSquare, Heart } from "lucide-react"
import { LogGameButton } from "@/components/shared/LogGameButton"
import { InfiniteFeed } from "@/components/feed/InfiniteFeed"
import { getPopularGames, shapeGame, type ShapedGame } from "@/lib/igdb/fetch"
import { syncGamesToAlgolia } from "@/lib/igdb/algolia/client"
import type { UserRow, GameLogRow, GameRow } from "@/types/database"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // ─── Parallel data fetching ────────────────────────────────
  const [
    profileRes,
    followingRes,
    popularRaw,
    recentLogsRes,
    activeUsersRes,
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    getPopularGames(12),
    (supabase.from("game_logs").select("game_id, games(*)").order("created_at", { ascending: false }).limit(30) as any),
    (supabase.rpc("get_active_users_fallback").limit(8) as any),
  ])

  const profile = profileRes.data
  const displayName =
    profile?.display_name ??
    (user.user_metadata as Record<string, string> | null)?.username ??
    user.email?.split("@")[0] ??
    "there"

  const followingIds = (followingRes.data ?? []).map((f: { following_id: string }) => f.following_id)
  const feedUserIds = [...followingIds, user.id]

  // ─── Popular games from IGDB ───────────────────────────────
  const popularGames = popularRaw.map(shapeGame)
  syncGamesToAlgolia(popularGames).catch(() => {})

  // ─── Trending in community (deduped recent logs) ──────────
  const seenIds = new Set<number>()
  const trendingGames: GameRow[] = []
  for (const log of (recentLogsRes.data ?? []) as { game_id: number; games: GameRow }[]) {
    if (log.games && !seenIds.has(log.game_id)) {
      seenIds.add(log.game_id)
      trendingGames.push(log.games)
      if (trendingGames.length >= 8) break
    }
  }

  // ─── Players to follow ────────────────────────────────────
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

  // ─── Social feed ──────────────────────────────────────────
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

  // Like counts, user likes, comment counts in parallel
  const [likeCountsRes, userLikesRes, commentCountsRes, logCountRes, followerCountRes] = await Promise.all([
    (supabase.from("likes").select("log_id").in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]) as any),
    supabase.from("likes").select("log_id").eq("user_id", user.id).in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]),
    (supabase.from("comments").select("log_id").in("log_id", feedLogIds.length > 0 ? feedLogIds : [""]) as any),
    supabase.from("game_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
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

  // ─── Recent reviews (feed entries that have review text) ───
  const recentReviews = feedEntries.filter((e) => e.review_text && e.review_text.trim().length > 0).slice(0, 4)

  // ─── Hero backdrop covers (use popular + trending combined) ─
  const heroCovers = [...popularGames, ...trendingGames]
    .filter((g) => g.cover_url)
    .slice(0, 6)

  return (
    <div className="min-h-screen">
      {/* ─── Hero Backdrop Strip ───────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Game cover backdrop */}
        <div className="absolute inset-0 flex">
          {heroCovers.map((game, i) => (
            <div key={game.id} className="relative flex-1 min-w-0" style={{ opacity: 1 - i * 0.08 }}>
              {game.cover_url && (
                <Image
                  src={game.cover_url.replace("t_cover_big", "t_screenshot_big")}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="20vw"
                  unoptimized
                  priority={i < 3}
                />
              )}
            </div>
          ))}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-zinc-950/90" />
        </div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 tracking-tight leading-tight">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-2 text-base text-zinc-400 leading-relaxed max-w-md">
              Track games you play. Save those you want to try. Tell your friends what&apos;s good.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <LogGameButton />
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/profile/${profile?.username}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <span className="font-bold text-zinc-300 font-mono tabular-nums">{logCount}</span> games
                </Link>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-500">
                  <span className="font-bold text-zinc-300 font-mono tabular-nums">{followingIds.length}</span> following
                </span>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-500">
                  <span className="font-bold text-zinc-300 font-mono tabular-nums">{followerCount}</span> followers
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ─── New From Friends — Film-strip style ─────────── */}
        {trendingGames.length > 0 && (
          <section className="py-6 border-b border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                New from your community
              </h2>
            </div>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {trendingGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.slug}`}
                  className="group relative flex-shrink-0"
                >
                  <div className="relative w-[100px] sm:w-[120px] aspect-[3/4] overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-white/5 transition-all group-hover:ring-indigo-400/60 group-hover:brightness-110">
                    {game.cover_url ? (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        fill
                        className="object-cover"
                        sizes="120px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
                        {game.title}
                      </div>
                    )}
                    {/* Hover overlay with title */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">
                        {game.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Popular This Week ─────────────────────────── */}
        {popularGames.length > 0 && (
          <section className="py-6 border-b border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Popular this week
              </h2>
              <Link
                href="/search"
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                More <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 sm:gap-2">
              {popularGames.slice(0, 10).map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.slug}`}
                  className="group relative"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-white/5 transition-all group-hover:ring-indigo-400/60 group-hover:brightness-110">
                    {game.cover_url ? (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 10vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
                        {game.title}
                      </div>
                    )}
                    {/* Rating badge */}
                    {game.rating != null && (
                      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/70 backdrop-blur-sm px-1 py-0.5 text-[9px] font-bold text-yellow-400">
                        <Star className="h-2 w-2 fill-current" />
                        {game.rating.toFixed(1)}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <p className="text-[9px] font-medium text-white leading-tight line-clamp-2">
                        {game.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Recent Reviews ────────────────────────────── */}
        {recentReviews.length > 0 && (
          <section className="py-6 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Recent reviews
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex gap-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 p-3 hover:border-zinc-700/60 transition-colors"
                >
                  {/* Cover */}
                  <Link
                    href={`/game/${review.game_slug}`}
                    className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-white/5 hover:ring-indigo-400/40 transition-all"
                  >
                    {review.cover_url && (
                      <Image
                        src={review.cover_url}
                        alt={review.game_title}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    )}
                  </Link>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/game/${review.game_slug}`}
                          className="text-sm font-bold text-zinc-100 hover:text-indigo-300 transition-colors leading-tight block truncate"
                        >
                          {review.game_title}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Link
                            href={`/profile/${review.username}`}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {review.display_name || review.username}
                          </Link>
                          {review.rating != null && review.rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: Math.floor(review.rating) }).map((_, i) => (
                                <Star key={i} className="h-2.5 w-2.5 fill-indigo-400 text-indigo-400" />
                              ))}
                              {review.rating % 1 >= 0.5 && (
                                <Star className="h-2.5 w-2.5 fill-indigo-400/50 text-indigo-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed line-clamp-2">
                      {review.review_text}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                      {review.likeCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5" /> {review.likeCount}
                        </span>
                      )}
                      {review.commentCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="h-2.5 w-2.5" /> {review.commentCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Feed + Sidebar ────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8 py-6">
          {/* Main feed column */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Friend activity
            </h2>

            {feedEntries.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 py-16 text-center">
                <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
                <h3 className="text-base font-semibold text-zinc-300">
                  Your feed is empty
                </h3>
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

          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-5">
            {/* Players */}
            {usersToShow.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Popular members
                </h3>
                <div className="space-y-1">
                  {usersToShow.slice(0, 6).map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-2.5 rounded-lg p-2 -mx-2 hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700/40">
                        {u.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt={u.display_name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserIcon className="h-3 w-3 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-300 truncate">
                          {u.display_name}
                        </p>
                        <p className="text-[10px] text-zinc-600 truncate">@{u.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            {profile && (
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-zinc-200 font-mono tabular-nums">
                      {logCount}
                    </p>
                    <p className="text-[10px] text-zinc-600">Games</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-zinc-200 font-mono tabular-nums">
                      {followingIds.length}
                    </p>
                    <p className="text-[10px] text-zinc-600">Following</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-zinc-200 font-mono tabular-nums">
                      {followerCount}
                    </p>
                    <p className="text-[10px] text-zinc-600">Followers</p>
                  </div>
                </div>
                <Link
                  href={`/profile/${profile.username}`}
                  className="mt-3 flex items-center justify-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  View profile <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Links */}
            <div className="space-y-1.5 text-xs text-zinc-600 pt-2">
              <div className="flex items-center gap-3">
                <Link href="/stats" className="hover:text-zinc-400 transition-colors">Stats</Link>
                <Link href="/backlog" className="hover:text-zinc-400 transition-colors">Backlog</Link>
                <Link href="/lists" className="hover:text-zinc-400 transition-colors">Lists</Link>
                <Link href="/activity" className="hover:text-zinc-400 transition-colors">Activity</Link>
              </div>
              <p className="text-zinc-700 pt-1">HIGH-SCORE &mdash; Track your games.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

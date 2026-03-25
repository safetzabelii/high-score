import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Gamepad2, MessageSquare, Heart, Calendar } from "lucide-react"
import { HeartRatingDisplay } from "@/components/shared/StarRating"
import { LogGameButton } from "@/components/shared/LogGameButton"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { GameCover } from "@/components/shared/GameCover"
import { getPopularThisWeek, getHiddenGems, getComingSoon, shapeGame, warmGameCache } from "@/lib/igdb/fetch"
import { syncGamesToAlgolia } from "@/lib/igdb/algolia/client"
import { CommunitySlider } from "@/components/home/CommunitySlider"
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
    hiddenGemsRaw,
    comingSoonRaw,
    recentLogsRes,
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    getPopularThisWeek(12),
    getHiddenGems(8).catch(() => []),
    getComingSoon(8).catch(() => []),
    (supabase.from("game_logs").select("game_id, games(*)").order("created_at", { ascending: false }).limit(30) as any),
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
  const hiddenGems = hiddenGemsRaw.map(shapeGame)
  const comingSoonGames = comingSoonRaw.map((g) => {
    const shaped = shapeGame(g)
    // Preserve full release date for display
    const releaseDate = g.first_release_date
      ? new Date(g.first_release_date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null
    return { ...shaped, releaseDate }
  })

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
        {/* ─── New From Community — scrollable poster strip ──── */}
        {trendingGames.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="New from your community" moreHref="/activity" moreLabel="All activity" />
            <CommunitySlider games={trendingGames} />
          </section>
        )}

        {/* ─── Popular This Week — grid ──────────────────────── */}
        {popularGames.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="Popular this week" moreHref="/discover/popular" />
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

        {/* ─── Coming Soon — upcoming releases ────────────────── */}
        {comingSoonGames.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="Coming soon" moreHref="/discover/comingSoon" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {comingSoonGames.slice(0, 4).map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.slug}`}
                  className="group flex gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-2.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="relative h-[72px] w-[48px] flex-shrink-0 overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30">
                    {game.cover_url && (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[13px] font-medium text-zinc-200 group-hover:text-zinc-50 transition-colors truncate">
                      {game.title}
                    </p>
                    {game.releaseDate && (
                      <p className="flex items-center gap-1 mt-1 text-[11px] text-zinc-500">
                        <Calendar className="h-3 w-3" />
                        {game.releaseDate}
                      </p>
                    )}
                    {game.developer && (
                      <p className="mt-0.5 text-[11px] text-zinc-600 truncate">{game.developer}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Hidden Gems — under-the-radar quality games ───── */}
        {hiddenGems.length > 0 && (
          <section className="pb-8">
            <SectionHeading title="Hidden gems" moreHref="/discover/hiddenGems" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
              {hiddenGems.slice(0, 8).map((game) => (
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

        {/* ─── Friend Activity — two-column, limited preview ──── */}
        <section className="pb-8">
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
            <>
              <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
                {feedEntries.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-3 py-3 border-b border-zinc-800/50"
                  >
                    <Link
                      href={`/game/${entry.game_slug}`}
                      className="relative h-[80px] w-[54px] flex-shrink-0 overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover"
                    >
                      {entry.cover_url && (
                        <Image
                          src={entry.cover_url}
                          alt={entry.game_title}
                          fill
                          className="object-cover"
                          sizes="54px"
                        />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0 py-0.5">
                      <Link
                        href={`/game/${entry.game_slug}`}
                        className="text-[13px] font-medium text-zinc-200 hover:text-zinc-50 transition-colors leading-tight line-clamp-1"
                      >
                        {entry.game_title}
                      </Link>
                      {entry.rating != null && entry.rating > 0 && (
                        <div className="mt-0.5">
                          <HeartRatingDisplay rating={entry.rating} />
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <Link href={`/profile/${entry.username}`} className="font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
                          {entry.display_name || entry.username}
                        </Link>
                        <span className="text-zinc-600">&middot;</span>
                        <span className="text-zinc-600">
                          {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {feedEntries.length > 6 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/activity"
                    className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    See all activity
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
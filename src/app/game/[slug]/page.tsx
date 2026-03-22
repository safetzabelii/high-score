import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Gamepad2, Eye, Heart, List as ListIcon, MessageSquare } from "lucide-react"
import { HeartRatingDisplay } from "@/components/shared/StarRating"
import { ShareButton } from "@/components/shared/ShareButton"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { getCachedGameBySlug, coverUrl } from "@/lib/igdb/fetch"
import { syncGameToAlgolia } from "@/lib/igdb/algolia/client"
import { createClient } from "@/lib/supabase/server"
import { GamePageActions } from "@/components/game/GamePageActions"
import { GameSeries } from "@/components/game/GameSeries"
import { ReviewSection } from "@/components/game/ReviewSection"
import type { UserRow, GameLogRow } from "@/types/database"


interface GamePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params
  // Use the cached version — this is often already warm from the page load
  const game = await getCachedGameBySlug(slug)
  if (!game) return { title: "Game not found — HIGH-SCORE" }
  const description = game.summary?.slice(0, 160) ?? `${game.title} on HIGH-SCORE`
  const ogImage = game.cover_url ?? undefined

  return {
    title: `${game.title} — HIGH-SCORE`,
    description,
    openGraph: {
      title: `${game.title} — HIGH-SCORE`,
      description,
      type: "website",
      siteName: "HIGH-SCORE",
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} — HIGH-SCORE`,
      description,
    },
  }
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params

  // ── Fetch game data from cache (Supabase) or IGDB as fallback ──
  const game = await getCachedGameBySlug(slug)
  if (!game) notFound()

  const supabase = await createClient()

  // ── Fire-and-forget: sync to games table + Algolia ─────────────
  // These don't block the page render
  Promise.all([
    (supabase.from("games") as any).upsert(
      {
        id: game.id,
        title: game.title,
        slug: game.slug,
        cover_url: game.cover_url,
        release_year: game.release_year,
      },
      { onConflict: "id" }
    ),
    syncGameToAlgolia(game).catch(() => {}),
  ])

  // ── Parallel data fetches from Supabase ────────────────────────
  const [authRes, logsRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("game_logs")
      .select("*, users(*)")
      .eq("game_id", game.id)
      .order("created_at", { ascending: false }) as any,
  ])

  const currentUser = authRes.data.user
  const logs = (logsRes.data ?? []) as (GameLogRow & { users: UserRow })[]

  const ratingsOnly = logs.filter((l) => l.rating != null && l.rating > 0)
  const avgRating =
    ratingsOnly.length > 0
      ? Math.round(
          (ratingsOnly.reduce((sum, l) => sum + l.rating!, 0) /
            ratingsOnly.length) *
            10
        ) / 10
      : null
  const reviews = logs.filter(
    (l) => l.review_text && l.review_text.trim().length > 0
  )

  const reviewIds = reviews.map((r) => r.id)

  // ── Status breakdown for engagement metrics ──────────────────
  const statusCounts: Record<string, number> = { played: 0, playing: 0, completed: 0, backlog: 0, wishlist: 0, abandoned: 0 }
  for (const l of logs) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1
  }

  // ── Parallel: likes, user likes, comment counts, lists featuring ──
  const [likeCountsRes, userLikesRes, commentCountsRes, listsFeaturingRes] = await Promise.all([
    supabase
      .from("likes")
      .select("log_id")
      .in("log_id", reviewIds.length > 0 ? reviewIds : [""]) as any,
    currentUser
      ? supabase
          .from("likes")
          .select("log_id")
          .eq("user_id", currentUser.id)
          .in("log_id", reviewIds.length > 0 ? reviewIds : [""])
      : Promise.resolve({ data: [] }),
    supabase
      .from("comments")
      .select("log_id")
      .in("log_id", reviewIds.length > 0 ? reviewIds : [""]) as any,
    (supabase
      .from("list_items")
      .select("list_id, lists(id, title, user_id, users(username, display_name))")
      .eq("game_id", game.id)
      .limit(6) as any),
  ])

  const likeCountMap = new Map<string, number>()
  for (const like of (likeCountsRes.data ?? []) as { log_id: string }[]) {
    likeCountMap.set(like.log_id, (likeCountMap.get(like.log_id) ?? 0) + 1)
  }

  const likedSet = new Set(
    ((userLikesRes.data ?? []) as { log_id: string }[]).map((l) => l.log_id)
  )

  const commentCountMap = new Map<string, number>()
  for (const c of (commentCountsRes.data ?? []) as { log_id: string }[]) {
    commentCountMap.set(c.log_id, (commentCountMap.get(c.log_id) ?? 0) + 1)
  }

  // Process lists featuring this game
  type ListFeaturing = {
    list_id: string
    lists: {
      id: string
      title: string
      user_id: string
      users: { username: string; display_name: string }
    } | null
  }
  const listsFeaturingRaw = (listsFeaturingRes.data ?? []) as ListFeaturing[]
  const listsFeaturing = listsFeaturingRaw
    .filter((item) => item.lists?.users)
    .map((item) => ({
      id: item.lists!.id,
      title: item.lists!.title,
      username: item.lists!.users.username,
      displayName: item.lists!.users.display_name,
    }))
  // Deduplicate by list id
  const seenListIds = new Set<string>()
  const uniqueLists = listsFeaturing.filter((l) => {
    if (seenListIds.has(l.id)) return false
    seenListIds.add(l.id)
    return true
  })

  const currentUserLog = currentUser
    ? logs.find((l) => l.user_id === currentUser.id) ?? null
    : null

  // ── Hero image from cached screenshots — NEVER use artworks (they're logos) ──
  // Prefer later screenshots (first is often a title screen)
  const screenshots = game.screenshots ?? []
  const screenshot = screenshots[2] || screenshots[1] || screenshots[0]
  const heroUrl = screenshot
    ? screenshot.replace(/t_[a-z0-9_]+/, "t_1080p")
    : null
  const highResCover = game.cover_url
    ? game.cover_url.replace(/t_[a-z0-9_]+/, "t_720p")
    : null

  const existingLogForModal = currentUserLog
    ? {
        id: currentUserLog.id,
        rating: currentUserLog.rating,
        status: currentUserLog.status,
        review_text: currentUserLog.review_text,
        platforms: currentUserLog.platforms,
        playtime_hours: currentUserLog.playtime_hours,
        contains_spoilers: currentUserLog.contains_spoilers,
        logged_date: currentUserLog.logged_date,
      }
    : null

  const gameForModal = {
    id: game.id,
    title: game.title,
    slug: game.slug,
    cover_url: game.cover_url,
    release_year: game.release_year,
    platforms: game.platforms,
    genres: game.genres,
    developer: game.developer,
    rating: game.rating,
  }

  // Rating histogram
  const ratingBuckets = new Array(10).fill(0) // 0.5, 1.0, 1.5, ... 5.0
  for (const l of ratingsOnly) {
    const idx = Math.round(l.rating! * 2) - 1
    if (idx >= 0 && idx < 10) ratingBuckets[idx]++
  }
  const maxBucket = Math.max(...ratingBuckets, 1)

  return (
    <div className="min-h-screen">
      {/* ─── Hero Backdrop — Letterboxd-style ────────────────── */}
      <div className="relative h-44 sm:h-80 lg:h-96 overflow-hidden">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      </div>

      {/* ─── Content — two-column Letterboxd layout ──────────── */}
      <div className="relative -mt-20 sm:-mt-32 mx-auto max-w-[960px] px-4 pb-16">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          {/* LEFT: Cover + Stats */}
          <div className="flex-shrink-0 w-full sm:w-[230px] max-w-[230px] mx-auto sm:mx-0">
            {/* Cover poster */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px] border border-zinc-700/30 shadow-2xl bg-zinc-900">
              {highResCover ? (
                <Image
                  src={highResCover}
                  alt={game.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gamepad2 className="h-12 w-12 text-zinc-700" />
                </div>
              )}
            </div>

            {/* Engagement metrics — status breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Eye className="h-3 w-3 text-zinc-500" />
                <span className="tabular-nums font-medium">{(statusCounts.played || 0) + (statusCounts.completed || 0)}</span> Played
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Gamepad2 className="h-3 w-3 text-emerald-500/70" />
                <span className="tabular-nums font-medium">{statusCounts.playing || 0}</span> Playing
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ListIcon className="h-3 w-3 text-zinc-500" />
                <span className="tabular-nums font-medium">{(statusCounts.backlog || 0) + (statusCounts.wishlist || 0)}</span> Backlog
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Heart className="h-3 w-3 text-zinc-500" />
                <span className="tabular-nums font-medium">{ratingsOnly.length}</span> Rated
              </span>
            </div>

            {/* Actions panel */}
            <div className="mt-5 space-y-3">
              {currentUser ? (
                <GamePageActions
                  game={gameForModal}
                  existingLog={existingLogForModal}
                  isWishlisted={currentUserLog?.status === "wishlist"}
                  gameId={game.id}
                />
              ) : (
                <Link
                  href={`/login?redirectTo=/game/${slug}`}
                  className="block text-center rounded-sm bg-hs-green-button hover:bg-hs-green-hover text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  Sign in to log
                </Link>
              )}
              <ShareButton url={`/game/${slug}`} title={`${game.title} on HIGH-SCORE`} />
            </div>

            {/* Rating histogram */}
            {ratingsOnly.length > 0 && (
              <div className="mt-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="section-heading">Ratings</span>
                  <span className="text-[11px] text-zinc-500">{ratingsOnly.length} fans</span>
                </div>
                <div className="flex items-end gap-[2px] h-[50px]">
                  {ratingBuckets.map((count, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-zinc-600 hover:bg-hs-green/60 transition-colors rounded-t-[1px]"
                      style={{ height: `${Math.max((count / maxBucket) * 100, 2)}%` }}
                      title={`${(i + 1) * 0.5} stars: ${count}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-zinc-600">
                  <span>0.5</span>
                  <span>5.0</span>
                </div>
                {avgRating != null && (
                  <div className="flex items-center gap-2 mt-2">
                    <HeartRatingDisplay rating={avgRating} />
                    <span className="text-lg font-light text-zinc-200 tabular-nums">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Game info + reviews */}
          <div className="flex-1 min-w-0 pt-2 sm:pt-32">
            {/* Title — serif */}
            <h1 className="font-serif text-3xl sm:text-[32px] font-bold text-zinc-50 leading-tight">
              {game.title}
            </h1>

            {/* Year + developer */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] text-zinc-400">
              {game.release_year && (
                <span className="text-zinc-300">{game.release_year}</span>
              )}
              {game.developer && (
                <>
                  <span className="text-zinc-600">&middot;</span>
                  <span>Developed by <span className="font-semibold text-zinc-200">{game.developer}</span></span>
                </>
              )}
              {game.publisher && game.publisher !== game.developer && (
                <>
                  <span className="text-zinc-600">&middot;</span>
                  <span>{game.publisher}</span>
                </>
              )}
            </div>

            {/* Genres as inline pills */}
            {game.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {game.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-zinc-800/60 px-2.5 py-0.5 text-xs text-zinc-300 border border-zinc-700/40"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Summary — serif body text */}
            {game.summary && (
              <div className="mt-5">
                <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl">
                  {game.summary}
                </p>
              </div>
            )}

            {/* Platforms */}
            {game.platforms.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {game.platforms.map((plat) => (
                  <span
                    key={plat}
                    className="rounded bg-zinc-800/50 px-2 py-0.5 text-[11px] text-zinc-500 border border-zinc-700/30"
                  >
                    {plat}
                  </span>
                ))}
              </div>
            )}

            {/* IGDB rating */}
            {game.rating != null && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
                <Heart className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-semibold text-zinc-200 tabular-nums">{game.rating.toFixed(1)}</span>
                <span className="text-[11px] uppercase tracking-wider">IGDB</span>
              </div>
            )}

            {/* Where to Play */}
            {game.stores && game.stores.length > 0 && (
              <div className="mt-6">
                <h3 className="section-heading mb-3">Where to Play</h3>
                <div className="flex flex-wrap gap-2">
                  {game.stores.map((store) => (
                    <a
                      key={store.name}
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-3.5 py-2 text-[13px] text-zinc-300 hover:bg-zinc-700/60 hover:text-white hover:border-zinc-600 transition-all group"
                    >
                      <StoreIcon icon={store.icon} />
                      <span className="font-medium">{store.name}</span>
                      <svg className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Featured in Lists ──────────────────────────────── */}
        {uniqueLists.length > 0 && (
          <div className="mt-12">
            <SectionHeading title="Featured in lists" />
            <div className="grid gap-2 sm:grid-cols-2">
              {uniqueLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 hover:border-zinc-700 transition-colors group"
                >
                  <ListIcon className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-zinc-200 group-hover:text-zinc-50 truncate transition-colors">
                      {list.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      by {list.displayName || list.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── Game Series / Franchise ─────────────────────────── */}
        {(game.collection || game.franchise) && (
          <div className="mt-12">
            <GameSeries
              gameId={game.id}
              collectionId={game.collection?.id ?? null}
              franchiseId={game.franchise?.id ?? null}
            />
          </div>
        )}

        {/* ─── Community Reviews ─────────────────────────────── */}
        <div className="mt-12">
          <SectionHeading title={`Community Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}`} />

          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">
              No reviews yet. Be the first to share your thoughts!
            </p>
          ) : (
            <ReviewSection
              reviews={reviews as any}
              currentUserId={currentUser?.id ?? null}
              likedSet={likedSet}
              likeCountMap={likeCountMap}
              commentCountMap={commentCountMap}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function StoreIcon({ icon }: { icon: string }) {
  const cls = "h-4 w-4 flex-shrink-0"
  switch (icon) {
    case "steam":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.979 0C5.678 0 .511 4.86.022 10.935l6.432 2.658a3.387 3.387 0 0 1 1.912-.59c.064 0 .128.002.191.006l2.861-4.142V8.77c0-2.58 2.1-4.68 4.68-4.68 2.58 0 4.68 2.1 4.68 4.68s-2.1 4.682-4.68 4.682h-.109l-4.078 2.91c0 .048.003.097.003.146 0 1.94-1.577 3.516-3.516 3.516-1.694 0-3.112-1.2-3.44-2.795L.453 15.305A11.98 11.98 0 0 0 11.979 24c6.627 0 12-5.373 12-12S18.606 0 11.979 0z" />
        </svg>
      )
    case "epic":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V22.12c0 1.374.504 1.88 1.877 1.88h16.926c1.374 0 1.877-.506 1.877-1.88V1.88C22.34.506 21.837 0 20.463 0H3.537zm6.166 5.72h4.587v1.297H11.01v2.594h3.28v1.296H11.01v2.594h3.28v1.297H9.703V5.72zm-4.464 0h1.307v7.781h3.28v1.297H5.24V5.72z" />
        </svg>
      )
    case "gog":
      return <span className={`${cls} text-[11px] font-bold flex items-center justify-center`}>GOG</span>
    case "itch":
      return <span className={`${cls} text-[11px] font-bold flex items-center justify-center`}>itch</span>
    case "apple":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      )
    case "android":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.523 15.341c-.583 0-1.054.471-1.054 1.054 0 .583.471 1.054 1.054 1.054.583 0 1.055-.471 1.055-1.054 0-.583-.472-1.054-1.055-1.054zm-11.046 0c-.583 0-1.054.471-1.054 1.054 0 .583.471 1.054 1.054 1.054.583 0 1.055-.471 1.055-1.054 0-.583-.472-1.054-1.055-1.054zM17.834 10.18l1.905-3.3a.397.397 0 0 0-.145-.542.397.397 0 0 0-.542.145l-1.929 3.341A11.724 11.724 0 0 0 12 8.82c-1.842 0-3.578.398-5.123 1.004L4.948 6.483a.397.397 0 0 0-.542-.145.397.397 0 0 0-.145.542l1.905 3.3C2.879 12.09.5 15.483.5 19.411h23c0-3.928-2.379-7.321-5.666-9.231z" />
        </svg>
      )
    case "playstation":
      return <span className={`${cls} text-[10px] font-bold flex items-center justify-center`}>PS</span>
    case "nintendo":
      return <span className={`${cls} text-[10px] font-bold flex items-center justify-center`}>NS</span>
    case "xbox":
      return <span className={`${cls} text-[10px] font-bold flex items-center justify-center`}>XB</span>
    default:
      return <span className="text-sm">🌐</span>
  }
}
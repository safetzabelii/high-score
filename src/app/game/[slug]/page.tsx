import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Gamepad2, Star, Eye, Heart, List as ListIcon, MessageSquare } from "lucide-react"
import { ShareButton } from "@/components/shared/ShareButton"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { getGameBySlug, shapeGame, coverUrl } from "@/lib/igdb/fetch"
import { syncGameToAlgolia } from "@/lib/igdb/algolia/client"
import { createClient } from "@/lib/supabase/server"
import { GamePageActions } from "@/components/game/GamePageActions"
import { ReviewCard } from "@/components/game/ReviewCard"
import type { UserRow, GameLogRow } from "@/types/database"

interface GamePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params
  const raw = await getGameBySlug(slug)
  if (!raw) return { title: "Game not found — HIGH-SCORE" }
  const game = shapeGame(raw)
  const description = raw.summary?.slice(0, 160) ?? `${game.title} on HIGH-SCORE`
  const ogImage = game.cover_url ?? undefined

  return {
    title: `${game.title} — HIGH-SCORE`,
    description,
    openGraph: {
      title: `${game.title} — HIGH-SCORE`,
      description,
      images: ogImage ? [{ url: ogImage, width: 264, height: 374 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${game.title} — HIGH-SCORE`,
      description,
      images: ogImage ? [ogImage] : [],
    },
  }
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params
  const raw = await getGameBySlug(slug)
  if (!raw) notFound()

  const game = shapeGame(raw)
  const publisher =
    raw.involved_companies?.find((c) => c.publisher)?.company.name ?? null

  const supabase = await createClient()
  await (supabase.from("games") as any).upsert(
    {
      id: game.id,
      title: game.title,
      slug: game.slug,
      cover_url: game.cover_url,
      release_year: game.release_year,
    },
    { onConflict: "id" }
  )

  syncGameToAlgolia(game).catch(() => {})

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data: allLogs } = await (supabase
    .from("game_logs")
    .select("*, users(*)")
    .eq("game_id", game.id)
    .order("created_at", { ascending: false }) as any)

  const logs = (allLogs ?? []) as (GameLogRow & { users: UserRow })[]

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

  const { data: likeCounts } = await (supabase
    .from("likes")
    .select("log_id")
    .in("log_id", reviewIds.length > 0 ? reviewIds : [""]) as any)

  const likeCountMap = new Map<string, number>()
  for (const like of (likeCounts ?? []) as { log_id: string }[]) {
    likeCountMap.set(like.log_id, (likeCountMap.get(like.log_id) ?? 0) + 1)
  }

  let likedSet = new Set<string>()
  if (currentUser) {
    const { data: userLikes } = await supabase
      .from("likes")
      .select("log_id")
      .eq("user_id", currentUser.id)
      .in("log_id", reviewIds.length > 0 ? reviewIds : [""])

    likedSet = new Set((userLikes ?? []).map((l) => l.log_id))
  }

  const { data: commentCounts } = await (supabase
    .from("comments")
    .select("log_id")
    .in("log_id", reviewIds.length > 0 ? reviewIds : [""]) as any)

  const commentCountMap = new Map<string, number>()
  for (const c of (commentCounts ?? []) as { log_id: string }[]) {
    commentCountMap.set(c.log_id, (commentCountMap.get(c.log_id) ?? 0) + 1)
  }

  const currentUserLog = currentUser
    ? logs.find((l) => l.user_id === currentUser.id) ?? null
    : null

  const screenshot = raw.screenshots?.[0]?.url || raw.artworks?.[0]?.url
  const heroUrl = screenshot
    ? "https:" + screenshot.replace(/t_[a-z0-9_]+/, "t_screenshot_big")
    : null
  const highResCover = coverUrl(raw.cover?.url, "720p")

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
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      </div>

      {/* ─── Content — two-column Letterboxd layout ──────────── */}
      <div className="relative -mt-32 mx-auto max-w-[960px] px-4 pb-16">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* LEFT: Cover + Stats */}
          <div className="flex-shrink-0 w-[230px]">
            {/* Cover poster */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px] border border-zinc-700/30 shadow-2xl bg-zinc-900">
              {highResCover ? (
                <Image
                  src={highResCover}
                  alt={game.title}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gamepad2 className="h-12 w-12 text-zinc-700" />
                </div>
              )}
            </div>

            {/* Stats bar — icon counts */}
            <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {logs.length}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {ratingsOnly.length}
              </span>
              <span className="flex items-center gap-1">
                <ListIcon className="h-3.5 w-3.5" />
                {reviews.length}
              </span>
            </div>

            {/* Actions panel */}
            <div className="mt-5 space-y-3">
              {currentUser ? (
                <GamePageActions
                  game={gameForModal}
                  existingLog={existingLogForModal}
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
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.floor(avgRating) }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-hs-green text-hs-green" />
                      ))}
                      {avgRating % 1 >= 0.5 && (
                        <Star className="h-3 w-3 fill-hs-green/50 text-hs-green" />
                      )}
                    </div>
                    <span className="text-lg font-light text-zinc-200 tabular-nums">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Game info + reviews */}
          <div className="flex-1 min-w-0 pt-4 sm:pt-32">
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
              {publisher && publisher !== game.developer && (
                <>
                  <span className="text-zinc-600">&middot;</span>
                  <span>{publisher}</span>
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
                <p className="text-[15px] text-zinc-400 leading-relaxed font-serif max-w-2xl">
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
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-zinc-200 tabular-nums">{game.rating.toFixed(1)}</span>
                <span className="text-[11px] uppercase tracking-wider">IGDB</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Community Reviews ─────────────────────────────── */}
        <div className="mt-12">
          <SectionHeading title={`Community Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}`} />

          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">
              No reviews yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div>
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review as any}
                  currentUserId={currentUser?.id ?? null}
                  initialLiked={likedSet.has(review.id)}
                  initialLikeCount={likeCountMap.get(review.id) ?? 0}
                  initialCommentCount={commentCountMap.get(review.id) ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

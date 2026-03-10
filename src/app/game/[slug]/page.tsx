import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Gamepad2, Star, Users, MessageSquare } from "lucide-react"
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
  return {
    title: `${game.title} — HIGH-SCORE`,
    description: raw.summary?.slice(0, 160) ?? `${game.title} on HIGH-SCORE`,
  }
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params

  // 1. Fetch from IGDB
  const raw = await getGameBySlug(slug)
  if (!raw) notFound()

  const game = shapeGame(raw)
  const publisher =
    raw.involved_companies?.find((c) => c.publisher)?.company.name ?? null

  // 2. Sync to DB + Algolia
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

  // 3. Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // 4. Fetch community logs for this game
  const { data: allLogs } = await (supabase
    .from("game_logs")
    .select("*, users(*)")
    .eq("game_id", game.id)
    .order("created_at", { ascending: false }) as any)

  const logs = (allLogs ?? []) as (GameLogRow & { users: UserRow })[]

  // 5. Community stats
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

  // 6. Current user's log (if any)
  const currentUserLog = currentUser
    ? logs.find((l) => l.user_id === currentUser.id) ?? null
    : null

  // 7. Images
  const screenshot = raw.screenshots?.[0]?.url || raw.artworks?.[0]?.url
  const heroUrl = screenshot
    ? "https:" + screenshot.replace(/t_[a-z0-9_]+/, "t_screenshot_big")
    : null
  const highResCover = coverUrl(raw.cover?.url, "720p")

  // Prepare data for client components
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

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero backdrop */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt=""
            fill
            className="object-cover opacity-25"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
      </div>

      {/* Main content */}
      <div className="relative -mt-28 mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Cover */}
          <div className="relative h-56 w-40 sm:h-72 sm:w-48 flex-shrink-0 overflow-hidden rounded-lg border-2 border-zinc-800 shadow-2xl bg-zinc-900">
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

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2 sm:pt-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 leading-tight">
              {game.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
              {game.developer && <span>{game.developer}</span>}
              {game.developer && publisher && publisher !== game.developer && (
                <span className="text-zinc-600">&middot;</span>
              )}
              {publisher && publisher !== game.developer && (
                <span>{publisher}</span>
              )}
              {game.release_year && (
                <>
                  <span className="text-zinc-600">&middot;</span>
                  <span>{game.release_year}</span>
                </>
              )}
            </div>

            {/* Genres */}
            {game.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {game.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs text-zinc-300 border border-zinc-700/50"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Platforms */}
            {game.platforms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {game.platforms.map((plat) => (
                  <span
                    key={plat}
                    className="rounded bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-500"
                  >
                    {plat}
                  </span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {game.rating != null && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold text-zinc-200 tabular-nums">
                    {game.rating.toFixed(1)}
                  </span>
                  <span className="text-zinc-500 text-xs">IGDB</span>
                </div>
              )}

              {avgRating != null && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Star className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-zinc-200 tabular-nums">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-zinc-500 text-xs">community</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-zinc-400">
                <Users className="h-4 w-4" />
                <span className="font-semibold text-zinc-200 tabular-nums">
                  {logs.length}
                </span>
                <span>{logs.length === 1 ? "log" : "logs"}</span>
              </div>

              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-semibold text-zinc-200 tabular-nums">
                    {reviews.length}
                  </span>
                  <span>{reviews.length === 1 ? "review" : "reviews"}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5">
              {currentUser ? (
                <GamePageActions
                  game={gameForModal}
                  existingLog={existingLogForModal}
                />
              ) : (
                <Link
                  href={`/login?redirectTo=/game/${slug}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-sm font-medium transition-all"
                >
                  Sign in to log this game
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        {game.summary && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">About</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
              {game.summary}
            </p>
          </div>
        )}

        {/* Community Reviews */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Community Reviews
            {reviews.length > 0 && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({reviews.length})
              </span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No reviews yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

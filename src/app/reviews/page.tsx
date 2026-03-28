import Link from "next/link"
import Image from "next/image"
import { Heart, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HeartRatingDisplay } from "@/components/shared/StarRating"
import type { GameLogRow, GameRow, UserRow } from "@/types/database"

export const metadata = {
  title: "Reviews — HIGH-SCORE",
}

export default async function ReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/reviews")

  // Find most-liked reviews first, then also recent reviews
  type FeedRow = GameLogRow & { users: UserRow; games: GameRow }

  const { data: allLikesRaw } = await (supabase
    .from("likes")
    .select("log_id")
    .limit(1000) as any)

  const allLikeCount = new Map<string, number>()
  for (const like of (allLikesRaw ?? []) as { log_id: string }[]) {
    allLikeCount.set(like.log_id, (allLikeCount.get(like.log_id) ?? 0) + 1)
  }
  const topLikedIds = Array.from(allLikeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([id]) => id)

  const [topLikedRes, recentRes] = await Promise.all([
    topLikedIds.length > 0
      ? (supabase
          .from("game_logs")
          .select("*, users(*), games(*)")
          .in("id", topLikedIds)
          .not("review_text", "is", null) as any)
      : Promise.resolve({ data: [] }),
    (supabase
      .from("game_logs")
      .select("*, users(*), games(*)")
      .not("review_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(50) as any),
  ])

  const seenIds = new Set<string>()
  const allRows: FeedRow[] = []
  for (const log of [...(topLikedRes.data ?? []), ...(recentRes.data ?? [])] as FeedRow[]) {
    if (!seenIds.has(log.id) && log.users && log.games) {
      seenIds.add(log.id)
      allRows.push(log)
    }
  }

  const reviewIds = allRows.map(l => l.id)

  const [likesRes, userLikesRes, commentsRes] = await Promise.all([
    (supabase.from("likes").select("log_id").in("log_id", reviewIds.length > 0 ? reviewIds : [""]) as any),
    supabase.from("likes").select("log_id").eq("user_id", user.id).in("log_id", reviewIds.length > 0 ? reviewIds : [""]),
    (supabase.from("comments").select("log_id").in("log_id", reviewIds.length > 0 ? reviewIds : [""]) as any),
  ])

  const likeMap = new Map<string, number>()
  for (const like of (likesRes.data ?? []) as { log_id: string }[]) {
    likeMap.set(like.log_id, (likeMap.get(like.log_id) ?? 0) + 1)
  }
  const likedSet = new Set((userLikesRes.data ?? []).map((l: { log_id: string }) => l.log_id))
  const commentMap = new Map<string, number>()
  for (const c of (commentsRes.data ?? []) as { log_id: string }[]) {
    commentMap.set(c.log_id, (commentMap.get(c.log_id) ?? 0) + 1)
  }

  const entries = allRows
    .filter(log => log.review_text && log.review_text.trim().length > 0)
    .map(log => ({
      id: log.id,
      rating: log.rating,
      review_text: log.review_text,
      contains_spoilers: log.contains_spoilers,
      created_at: log.created_at,
      username: log.users.username,
      display_name: log.users.display_name,
      avatar_url: log.users.avatar_url,
      game_title: log.games.title,
      cover_url: log.games.cover_url,
      game_slug: log.games.slug,
      likeCount: likeMap.get(log.id) ?? 0,
      likedByMe: likedSet.has(log.id),
      commentCount: commentMap.get(log.id) ?? 0,
    }))
    .sort((a, b) => b.likeCount - a.likeCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:py-10 sm:px-6">
      <div className="mb-8">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-500 block mb-1">
          Community
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-zinc-50 tracking-tight">
          Reviews
        </h1>
      </div>

      {entries.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-800/60 rounded-lg">
          <MessageSquare className="mx-auto h-8 w-8 text-zinc-800 mb-3" />
          <p className="text-sm text-zinc-600">No reviews yet</p>
        </div>
      ) : (
        <div className="grid gap-0 sm:grid-cols-2">
          {entries.map((review, idx) => (
            <div
              key={`${review.id}-${idx}`}
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
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" /> {review.likeCount} {review.likeCount === 1 ? "like" : "likes"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {review.commentCount} {review.commentCount === 1 ? "comment" : "comments"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

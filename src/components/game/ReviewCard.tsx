"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Star } from "lucide-react"
import { LikeButton } from "@/components/shared/LikeButton"
import { CommentSection } from "@/components/shared/CommentSection"
import { SpoilerGuard } from "@/components/shared/SpoilerGuard"

interface ReviewCardProps {
  review: {
    id: string
    user_id: string
    rating: number | null
    review_text: string | null
    platforms: string[]
    playtime_hours: number | null
    logged_date: string
    contains_spoilers: boolean
    users: {
      username: string
      display_name: string
      avatar_url: string | null
    }
  }
  currentUserId: string | null
  initialLiked: boolean
  initialLikeCount: number
  initialCommentCount: number
}

export function ReviewCard({
  review,
  currentUserId,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
}: ReviewCardProps) {
  const displayName = review.users.display_name || review.users.username

  return (
    <div className="border-b border-zinc-800/40 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      {/* Header: avatar + name + rating */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile/${review.users.username}`} className="flex-shrink-0">
          <div className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-zinc-700/40 bg-zinc-800 hover:ring-zinc-600 transition-all">
            {review.users.avatar_url ? (
              <Image
                src={review.users.avatar_url}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserIcon className="h-3.5 w-3.5 text-zinc-600" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${review.users.username}`}
              className="text-sm font-semibold text-zinc-200 hover:text-zinc-50 transition-colors"
            >
              {displayName}
            </Link>
            <span className="text-[11px] text-zinc-600">@{review.users.username}</span>
          </div>
        </div>

        {/* Star rating — inline compact */}
        {review.rating != null && review.rating > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {Array.from({ length: Math.floor(review.rating) }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
            ))}
            {review.rating % 1 >= 0.5 && (
              <Star className="h-3.5 w-3.5 fill-indigo-400/50 text-indigo-400" />
            )}
          </div>
        )}
      </div>

      {/* Review text */}
      {review.review_text && (
        <div className="mb-3">
          <SpoilerGuard containsSpoilers={review.contains_spoilers}>
            <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line">
              {review.review_text}
            </p>
          </SpoilerGuard>
        </div>
      )}

      {/* Meta + actions row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="tabular-nums">
            {new Date(review.logged_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {review.platforms.length > 0 && (
            <>
              <span className="text-zinc-700">&middot;</span>
              <span>{review.platforms.join(", ")}</span>
            </>
          )}
          {review.playtime_hours != null && (
            <>
              <span className="text-zinc-700">&middot;</span>
              <span>{review.playtime_hours}h</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LikeButton
            logId={review.id}
            logOwnerId={review.user_id}
            currentUserId={currentUserId}
            initialLiked={initialLiked}
            initialCount={initialLikeCount}
          />
        </div>
      </div>

      {/* Comments — full width below the review */}
      <div className="mt-3">
        <CommentSection
          logId={review.id}
          logOwnerId={review.user_id}
          currentUserId={currentUserId}
          initialCount={initialCommentCount}
        />
      </div>
    </div>
  )
}

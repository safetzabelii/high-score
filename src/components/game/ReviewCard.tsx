"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon } from "lucide-react"
import { StarRating } from "@/components/shared/StarRating"

interface ReviewCardProps {
  review: {
    id: string
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
}

export function ReviewCard({ review }: ReviewCardProps) {
  const displayName = review.users.display_name || review.users.username

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={`/profile/${review.users.username}`} className="flex-shrink-0">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
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
                <UserIcon className="h-4 w-4 text-zinc-600" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${review.users.username}`}
              className="text-sm font-medium text-zinc-200 hover:text-zinc-50 transition-colors"
            >
              {displayName}
            </Link>
            <span className="text-xs text-zinc-600">@{review.users.username}</span>
            {review.rating != null && review.rating > 0 && (
              <StarRating value={review.rating} onChange={() => {}} readonly size="sm" />
            )}
          </div>

          {/* Review text */}
          {review.review_text && (
            <div className="mt-2">
              {review.contains_spoilers ? (
                <details className="group">
                  <summary className="text-xs text-amber-500 cursor-pointer hover:text-amber-400">
                    Contains spoilers — click to reveal
                  </summary>
                  <p className="mt-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {review.review_text}
                  </p>
                </details>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {review.review_text}
                </p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
            <span>
              {new Date(review.logged_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {review.platforms.length > 0 && (
              <span>{review.platforms.join(", ")}</span>
            )}
            {review.playtime_hours != null && (
              <span>{review.playtime_hours}h played</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

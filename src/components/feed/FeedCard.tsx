"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon } from "lucide-react"
import { StarRating } from "@/components/shared/StarRating"
import { LikeButton } from "@/components/shared/LikeButton"

const STATUS_LABELS: Record<string, string> = {
  played: "played",
  playing: "is playing",
  backlog: "added to backlog",
  abandoned: "shelved",
}

interface FeedCardProps {
  entry: {
    id: string
    rating: number | null
    status: string
    review_text: string | null
    contains_spoilers: boolean
    platforms: string[]
    playtime_hours: number | null
    logged_date: string
    created_at: string
    user_id: string
    username: string
    display_name: string
    avatar_url: string | null
    game_id: number
    game_title: string
    cover_url: string | null
    game_slug: string
    likeCount: number
    likedByMe: boolean
  }
  currentUserId: string
}

export function FeedCard({ entry, currentUserId }: FeedCardProps) {
  const displayName = entry.display_name || entry.username
  const action = STATUS_LABELS[entry.status] ?? "logged"

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 transition-colors hover:border-zinc-700/80">
      <div className="flex gap-4">
        {/* Game cover */}
        <Link
          href={`/game/${entry.game_slug}`}
          className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-md transition-transform hover:scale-105"
        >
          {entry.cover_url ? (
            <Image
              src={entry.cover_url}
              alt={entry.game_title}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-zinc-600">
              {entry.game_title}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* User + action */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${entry.username}`}
              className="flex items-center gap-2"
            >
              <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                {entry.avatar_url ? (
                  <Image
                    src={entry.avatar_url}
                    alt={displayName}
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
              <span className="text-sm font-medium text-zinc-200 hover:text-zinc-50 transition-colors">
                {displayName}
              </span>
            </Link>
            <span className="text-sm text-zinc-500">{action}</span>
          </div>

          {/* Game title */}
          <Link
            href={`/game/${entry.game_slug}`}
            className="mt-1 block text-base font-semibold text-zinc-100 hover:text-indigo-300 transition-colors leading-snug"
          >
            {entry.game_title}
          </Link>

          {/* Rating */}
          {entry.rating != null && entry.rating > 0 && (
            <div className="mt-1.5">
              <StarRating
                value={entry.rating}
                onChange={() => {}}
                readonly
                size="sm"
              />
            </div>
          )}

          {/* Review */}
          {entry.review_text && entry.review_text.trim().length > 0 && (
            <div className="mt-2">
              {entry.contains_spoilers ? (
                <details className="group">
                  <summary className="text-xs text-amber-500 cursor-pointer hover:text-amber-400">
                    Contains spoilers — click to reveal
                  </summary>
                  <p className="mt-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-line line-clamp-4">
                    {entry.review_text}
                  </p>
                </details>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line line-clamp-4">
                  {entry.review_text}
                </p>
              )}
            </div>
          )}

          {/* Footer: time + platforms + like */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-zinc-600">
              <time>
                {new Date(entry.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              {entry.platforms.length > 0 && (
                <span>{entry.platforms.join(", ")}</span>
              )}
              {entry.playtime_hours != null && (
                <span>{entry.playtime_hours}h</span>
              )}
            </div>

            <LikeButton
              logId={entry.id}
              currentUserId={currentUserId}
              initialLiked={entry.likedByMe}
              initialCount={entry.likeCount}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

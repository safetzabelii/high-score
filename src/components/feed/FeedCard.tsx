"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon } from "lucide-react"
import { StarRating } from "@/components/shared/StarRating"
import { LikeButton } from "@/components/shared/LikeButton"
import { CommentSection } from "@/components/shared/CommentSection"
import { SpoilerGuard } from "@/components/shared/SpoilerGuard"

const STATUS_LABELS: Record<string, string> = {
  played: "played",
  playing: "is playing",
  backlog: "wants to play",
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
    commentCount: number
  }
  currentUserId: string
}

export function FeedCard({ entry, currentUserId }: FeedCardProps) {
  const displayName = entry.display_name || entry.username
  const action = STATUS_LABELS[entry.status] ?? "logged"

  return (
    <div className="group border-b border-zinc-800/40 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <div className="flex gap-3">
        {/* Game cover — Letterboxd poster style */}
        <Link
          href={`/game/${entry.game_slug}`}
          className="relative h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-white/5 transition-all hover:ring-indigo-400/50 hover:brightness-110"
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
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
              {entry.game_title}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Game title — bold, prominent */}
          <Link
            href={`/game/${entry.game_slug}`}
            className="text-[15px] font-bold text-zinc-100 hover:text-indigo-300 transition-colors leading-tight"
          >
            {entry.game_title}
          </Link>

          {/* Rating — inline stars */}
          {entry.rating != null && entry.rating > 0 && (
            <div className="mt-1">
              <StarRating
                value={entry.rating}
                onChange={() => {}}
                readonly
                size="sm"
              />
            </div>
          )}

          {/* Review text */}
          {entry.review_text && entry.review_text.trim().length > 0 && (
            <div className="mt-1.5">
              <SpoilerGuard containsSpoilers={entry.contains_spoilers}>
                <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-3">
                  {entry.review_text}
                </p>
              </SpoilerGuard>
            </div>
          )}

          {/* Meta line: user + action + date */}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600 flex-wrap">
            <Link
              href={`/profile/${entry.username}`}
              className="flex items-center gap-1 group/user"
            >
              <div className="relative h-4 w-4 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700/50">
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
                    <UserIcon className="h-2 w-2 text-zinc-600" />
                  </div>
                )}
              </div>
              <span className="font-medium text-zinc-400 group-hover/user:text-zinc-200 transition-colors">
                {displayName}
              </span>
            </Link>
            <span>{action}</span>
            <span className="text-zinc-700">&middot;</span>
            <time className="tabular-nums">
              {new Date(entry.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </time>
            {entry.platforms.length > 0 && (
              <>
                <span className="text-zinc-700">&middot;</span>
                <span className="truncate max-w-[100px]">{entry.platforms[0]}</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            <LikeButton
              logId={entry.id}
              logOwnerId={entry.user_id}
              currentUserId={currentUserId}
              initialLiked={entry.likedByMe}
              initialCount={entry.likeCount}
            />
            <CommentSection
              logId={entry.id}
              logOwnerId={entry.user_id}
              currentUserId={currentUserId}
              initialCount={entry.commentCount}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

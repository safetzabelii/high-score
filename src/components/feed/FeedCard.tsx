"use client"

import Image from "next/image"
import Link from "next/link"
import { Star, User as UserIcon } from "lucide-react"
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
    <div className="border-b border-zinc-800/50 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <div className="flex gap-3">
        {/* Game cover — poster */}
        <Link
          href={`/game/${entry.game_slug}`}
          className="relative h-[105px] w-[70px] flex-shrink-0 overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover"
        >
          {entry.cover_url ? (
            <Image
              src={entry.cover_url}
              alt={entry.game_title}
              fill
              className="object-cover"
              sizes="70px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
              {entry.game_title}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Game title — serif */}
          <Link
            href={`/game/${entry.game_slug}`}
            className="font-serif text-[15px] text-zinc-50 hover:text-hs-blue transition-colors leading-tight"
          >
            {entry.game_title}
          </Link>

          {/* Rating — green stars */}
          {entry.rating != null && entry.rating > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: Math.floor(entry.rating) }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-hs-green text-hs-green" />
              ))}
              {entry.rating % 1 >= 0.5 && (
                <Star className="h-3 w-3 fill-hs-green/50 text-hs-green" />
              )}
            </div>
          )}

          {/* Review text — serif */}
          {entry.review_text && entry.review_text.trim().length > 0 && (
            <div className="mt-1.5">
              <SpoilerGuard containsSpoilers={entry.contains_spoilers}>
                <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-3 font-serif">
                  {entry.review_text}
                </p>
              </SpoilerGuard>
            </div>
          )}

          {/* Meta: user + action + date */}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
            <Link
              href={`/profile/${entry.username}`}
              className="flex items-center gap-1.5 group/user"
            >
              <div className="relative h-5 w-5 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800">
                {entry.avatar_url ? (
                  <Image src={entry.avatar_url} alt={displayName} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserIcon className="h-2.5 w-2.5 text-zinc-600" />
                  </div>
                )}
              </div>
              <span className="font-semibold text-zinc-300 group-hover/user:text-zinc-50 transition-colors">
                {displayName}
              </span>
            </Link>
            <span className="text-zinc-600">{action}</span>
            <span className="text-zinc-700">&middot;</span>
            <time className="tabular-nums text-zinc-600">
              {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </time>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            <LikeButton
              logId={entry.id}
              logOwnerId={entry.user_id}
              currentUserId={currentUserId}
              initialLiked={entry.likedByMe}
              initialCount={entry.likeCount}
              showLabel
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

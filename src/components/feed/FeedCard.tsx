"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { User as UserIcon } from "lucide-react"
import { HeartRatingDisplay } from "@/components/shared/StarRating"
import { LikeButton } from "@/components/shared/LikeButton"
import { CommentSection } from "@/components/shared/CommentSection"
import { SpoilerGuard } from "@/components/shared/SpoilerGuard"
import { MarkdownText } from "@/components/shared/MarkdownText"
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  played: "played",
  playing: "is playing",
  completed: "completed",
  backlog: "wants to play",
  wishlist: "wishlisted",
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
  const [commentsOpen, setCommentsOpen] = useState(false)

  return (
    <div className="border-b border-zinc-800/50 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      {/* Top row: cover + content */}
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
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
              {entry.game_title}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Game title */}
          <Link
            href={`/game/${entry.game_slug}`}
            className="font-serif text-[15px] text-zinc-50 hover:text-hs-blue transition-colors leading-tight"
          >
            {entry.game_title}
          </Link>

          {/* Rating — hearts */}
          {entry.rating != null && entry.rating > 0 && (
            <div className="mt-1">
              <HeartRatingDisplay rating={entry.rating} />
            </div>
          )}

          {/* Review text */}
          {entry.review_text && entry.review_text.trim().length > 0 && entry.review_text !== "__steam_import__" && (
            <div className="mt-1.5">
              <SpoilerGuard containsSpoilers={entry.contains_spoilers}>
                <MarkdownText className="text-[13px] text-zinc-400" clamp={3}>
                  {entry.review_text}
                </MarkdownText>
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
                  <Image src={entry.avatar_url} alt={displayName} fill className="object-cover" />
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

          {/* Like + comment toggle — single clean row */}
          <div className="mt-2 flex items-center gap-4">
            <LikeButton
              logId={entry.id}
              logOwnerId={entry.user_id}
              currentUserId={currentUserId}
              initialLiked={entry.likedByMe}
              initialCount={entry.likeCount}
              showLabel
            />
            <button
              type="button"
              onClick={() => setCommentsOpen(!commentsOpen)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <MessageCircle className={`h-3.5 w-3.5 ${commentsOpen ? "text-hs-green" : ""}`} />
              {entry.commentCount > 0 && <span className="tabular-nums">{entry.commentCount}</span>}
              {commentsOpen ? (
                <ChevronUp className="h-3 w-3 ml-0.5" />
              ) : entry.commentCount > 0 ? (
                <ChevronDown className="h-3 w-3 ml-0.5" />
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {/* Comments — full width below entire card, aligned with content */}
      {commentsOpen && (
        <div className="mt-3 sm:ml-[82px]">
          <CommentSection
            logId={entry.id}
            logOwnerId={entry.user_id}
            currentUserId={currentUserId}
            initialCount={entry.commentCount}
            forceExpanded
          />
        </div>
      )}
    </div>
  )
}

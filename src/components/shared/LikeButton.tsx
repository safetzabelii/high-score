"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { createNotification, removeNotification } from "@/lib/notifications"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  logId: string
  logOwnerId: string
  currentUserId: string | null
  initialLiked: boolean
  initialCount: number
  showLabel?: boolean
}

export function LikeButton({
  logId,
  logOwnerId,
  currentUserId,
  initialLiked,
  initialCount,
  showLabel = false,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  async function toggleLike() {
    if (!currentUserId) return

    const wasLiked = liked
    const prevCount = count
    setLiked(!wasLiked)
    setCount(wasLiked ? prevCount - 1 : prevCount + 1)

    startTransition(async () => {
      try {
        if (wasLiked) {
          const { error } = await supabase
            .from("likes")
            .delete()
            .eq("user_id", currentUserId)
            .eq("log_id", logId)

          if (error) throw error

          removeNotification({
            userId: logOwnerId,
            actorId: currentUserId,
            type: "like",
            logId,
          })
        } else {
          const { error } = await (supabase.from("likes") as any).insert({
            user_id: currentUserId,
            log_id: logId,
          })

          if (error) throw error

          createNotification({
            userId: logOwnerId,
            actorId: currentUserId,
            type: "like",
            logId,
          })
        }
      } catch {
        setLiked(wasLiked)
        setCount(prevCount)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={!currentUserId || isPending}
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all",
        liked
          ? "text-hs-orange"
          : "text-zinc-500 hover:text-hs-orange",
        !currentUserId && "cursor-default opacity-50"
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5 transition-transform",
          liked && "fill-current scale-110"
        )}
      />
      {showLabel && (
        <span className="text-[11px]">
          {liked ? "Liked" : "Like"}
        </span>
      )}
      {count > 0 && (
        <span className="tabular-nums font-medium">{count}</span>
      )}
    </button>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  logId: string
  currentUserId: string | null
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({
  logId,
  currentUserId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  async function toggleLike() {
    if (!currentUserId) return

    // Optimistic update
    const wasLiked = liked
    const prevCount = count
    setLiked(!wasLiked)
    setCount(wasLiked ? prevCount - 1 : prevCount + 1)

    startTransition(async () => {
      try {
        if (wasLiked) {
          // Remove like
          const { error } = await supabase
            .from("likes")
            .delete()
            .eq("user_id", currentUserId)
            .eq("log_id", logId)

          if (error) throw error
        } else {
          // Add like
          const { error } = await (supabase.from("likes") as any).insert({
            user_id: currentUserId,
            log_id: logId,
          })

          if (error) throw error
        }
      } catch {
        // Rollback on error
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
        "flex items-center gap-1 text-xs transition-colors",
        liked
          ? "text-rose-400 hover:text-rose-300"
          : "text-zinc-600 hover:text-rose-400",
        !currentUserId && "cursor-default opacity-50"
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={cn("h-3.5 w-3.5", liked && "fill-current")}
      />
      {count > 0 && (
        <span className="tabular-nums">{count}</span>
      )}
    </button>
  )
}

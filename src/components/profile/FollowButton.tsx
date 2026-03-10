"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  targetUserId: string
  currentUserId: string
  initialFollowing: boolean
}

export function FollowButton({
  targetUserId,
  currentUserId,
  initialFollowing,
}: FollowButtonProps) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (loading) return
    const prev = following
    setLoading(true)
    // Optimistic update
    setFollowing(!prev)

    try {
      if (prev) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("follows") as any).insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        })
        if (error) throw error
      }
      router.refresh()
    } catch {
      // Rollback on failure
      setFollowing(prev)
      toast.error("Failed to update follow status.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        following
          ? "border border-zinc-700 text-zinc-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10"
          : "bg-indigo-600 text-white hover:bg-indigo-500"
      )}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {following ? "Unfollow" : "Follow"}
    </button>
  )
}

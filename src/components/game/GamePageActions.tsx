"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Plus, Check, Star, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import type { GameSearchResult, ExistingLog } from "@/components/forms/LogGameModal"

const LogGameModal = dynamic(() => import("@/components/forms/LogGameModal").then(m => ({ default: m.LogGameModal })), { ssr: false })

interface GamePageActionsProps {
  game: GameSearchResult
  existingLog: ExistingLog | null
  isWishlisted: boolean
  gameId: number
}

export function GamePageActions({ game, existingLog, isWishlisted: initialWishlisted, gameId }: GamePageActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newPlaythroughOpen, setNewPlaythroughOpen] = useState(false)
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  // If they have a log (played/playing/etc), don't show the wishlist button
  const hasNonWishlistLog = existingLog && existingLog.status !== "wishlist"

  async function toggleWishlist() {
    setWishlistLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("You must be logged in."); return }

      if (wishlisted) {
        // Remove wishlist entry
        await supabase
          .from("game_logs")
          .delete()
          .eq("user_id", user.id)
          .eq("game_id", gameId)
          .eq("status", "wishlist")
        setWishlisted(false)
        toast.success(`${game.title} removed from wishlist`)
      } else {
        // Upsert game first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("games") as any).upsert({
          id: gameId, title: game.title, slug: game.slug,
          cover_url: game.cover_url, release_year: game.release_year,
        }, { onConflict: "id" })

        // Create wishlist log entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("game_logs") as any).upsert({
          user_id: user.id,
          game_id: gameId,
          status: "wishlist",
          rating: null,
          review_text: null,
          contains_spoilers: false,
          platforms: [],
          playtime_hours: null,
          logged_date: new Date().toISOString().split("T")[0],
        }, { onConflict: "user_id,game_id" })
        setWishlisted(true)
        toast.success(`${game.title} added to wishlist`)
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Something went wrong.")
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          existingLog
            ? "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-5 py-2.5 text-sm font-medium transition-all"
            : "w-full inline-flex items-center justify-center gap-2 rounded-sm bg-hs-green-button hover:bg-hs-green-hover text-white shadow-lg shadow-black/30 px-5 py-2.5 text-sm font-medium transition-all"
        }
      >
        {existingLog ? (
          <>
            <Check className="h-4 w-4 text-green-400" />
            Logged — Edit
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Log this Game
          </>
        )}
      </button>

      {/* Log another playthrough — only show when user already has a log */}
      {existingLog && (
        <button
          type="button"
          onClick={() => setNewPlaythroughOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-700 bg-zinc-900 text-zinc-400 px-5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:border-zinc-600 hover:text-zinc-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Log Another Playthrough
        </button>
      )}

      {/* Wishlist button — only show when user hasn't logged the game with another status */}
      {!hasNonWishlistLog && (
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishlistLoading}
          className={
            wishlisted
              ? "w-full inline-flex items-center justify-center gap-2 rounded-sm border border-purple-500/50 bg-purple-500/10 text-purple-400 px-5 py-2.5 text-sm font-medium transition-all hover:bg-purple-500/20 disabled:opacity-50"
              : "w-full inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-700 bg-zinc-900 text-zinc-400 px-5 py-2.5 text-sm font-medium transition-all hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
          }
        >
          {wishlistLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star className={`h-4 w-4 ${wishlisted ? "fill-purple-400" : ""}`} />
          )}
          {wishlisted ? "Wishlisted" : "Add to Wishlist"}
        </button>
      )}

      <LogGameModal
        open={open}
        onClose={() => setOpen(false)}
        preselectedGame={game}
        existingLog={existingLog}
      />

      {/* Separate modal for new playthrough — no existingLog so it creates fresh */}
      {existingLog && (
        <LogGameModal
          open={newPlaythroughOpen}
          onClose={() => setNewPlaythroughOpen(false)}
          preselectedGame={game}
          existingLog={null}
          forceNewPlaythrough
        />
      )}
    </>
  )
}

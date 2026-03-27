"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { GameSearchCombobox } from "@/components/shared/GameSearchComboBox"
import type { GameSearchResult } from "@/hooks/useGameSearch"

interface AddGameToListProps {
  listId: string
  existingGameIds: number[]
  nextPosition: number
}

export function AddGameToList({ listId, existingGameIds, nextPosition }: AddGameToListProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function handleSelect(game: GameSearchResult) {
    const gameId = game.id ?? game.igdb_id
    if (!gameId) return

    if (existingGameIds.includes(gameId)) {
      toast.error("This game is already in the list")
      return
    }

    setAdding(true)

    try {
      // Ensure game exists in our DB
      await (supabase.from("games") as any).upsert(
        {
          id: gameId,
          title: game.title,
          slug: game.slug,
          cover_url: game.cover_url,
          release_year: game.release_year,
        },
        { onConflict: "id" }
      )

      // Add to list
      const { error } = await (supabase.from("list_items") as any).insert({
        list_id: listId,
        game_id: gameId,
        position: nextPosition,
      })

      if (error) throw error

      // Update list's updated_at
      await (supabase.from("lists") as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listId)

      toast.success(`Added ${game.title}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add game")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4">
      <p className="section-heading text-zinc-500 mb-2.5 flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5 text-zinc-500" />
        Add a game
      </p>
      {adding ? (
        <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding...
        </div>
      ) : (
        <GameSearchCombobox onSelect={handleSelect} placeholder="Search for a game to add..." />
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, Loader2, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { GameSearchCombobox } from "@/components/shared/GameSearchComboBox"
import type { GameSearchResult } from "@/components/forms/LogGameModal"
import { cn } from "@/lib/utils"

interface FavoriteGame {
  game_id: number
  position: number
  games: {
    id: number
    title: string
    slug: string
    cover_url: string | null
  }
}

interface FavoriteGamesProps {
  favorites: FavoriteGame[]
  isOwn: boolean
  userId: string
}

const MAX_FAVORITES = 4

export function FavoriteGames({ favorites: initialFavorites, isOwn, userId }: FavoriteGamesProps) {
  const router = useRouter()
  const [favorites, setFavorites] = useState(initialFavorites)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)

  async function handleAdd(selected: GameSearchResult) {
    const gameId = selected.igdb_id ?? selected.id ?? Number(selected.objectID)
    if (!gameId || isNaN(gameId)) return
    if (favorites.some(f => f.game_id === gameId)) {
      toast.error("Already in your favorites")
      setAdding(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("You must be logged in."); return }

      // Upsert game
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("games") as any).upsert({
        id: gameId, title: selected.title, slug: selected.slug,
        cover_url: selected.cover_url, release_year: selected.release_year,
      }, { onConflict: "id" })

      const nextPosition = favorites.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("favorite_games") as any).insert({
        user_id: user.id,
        game_id: gameId,
        position: nextPosition,
      })
      if (error) throw error

      setFavorites(prev => [...prev, {
        game_id: gameId,
        position: nextPosition,
        games: {
          id: gameId,
          title: selected.title,
          slug: selected.slug,
          cover_url: selected.cover_url,
        },
      }])
      setAdding(false)
      toast.success(`${selected.title} added to favorites`)
      router.refresh()
    } catch (err: any) {
      console.error("Favorite add error:", JSON.stringify(err, null, 2), err?.message, err?.code, err?.details)
      toast.error(err?.message || "Failed to add favorite")
    }
  }

  async function handleRemove(gameId: number) {
    setRemoving(gameId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("You must be logged in."); return }

      await supabase
        .from("favorite_games")
        .delete()
        .eq("user_id", user.id)
        .eq("game_id", gameId)

      setFavorites(prev => prev.filter(f => f.game_id !== gameId))
      toast.success("Removed from favorites")
      router.refresh()
    } catch {
      toast.error("Failed to remove")
    } finally {
      setRemoving(null)
    }
  }

  // Don't show section if not own profile and no favorites
  if (!isOwn && favorites.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-heading">Favorite Games</h2>
      </div>

      <div className="flex items-start gap-2">
        {favorites.map((fav) => (
          <div key={fav.game_id} className="group relative">
            <Link href={`/game/${fav.games.slug}`}>
              <div className="relative w-[72px] h-[96px] sm:w-[85px] sm:h-[113px] overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-white/5 transition-all group-hover:ring-hs-green/50 group-hover:brightness-110">
                {fav.games.cover_url ? (
                  <Image
                    src={fav.games.cover_url}
                    alt={fav.games.title}
                    fill
                    className="object-cover"
                    sizes="85px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-1 text-center text-[8px] text-zinc-600">
                    {fav.games.title}
                  </div>
                )}
              </div>
            </Link>
            {isOwn && (
              <button
                type="button"
                onClick={() => handleRemove(fav.game_id)}
                disabled={removing === fav.game_id}
                className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50 hover:text-red-400 hover:border-red-500/50"
              >
                {removing === fav.game_id ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <X className="h-2.5 w-2.5" />
                )}
              </button>
            )}
          </div>
        ))}

        {/* Add slot */}
        {isOwn && favorites.length < MAX_FAVORITES && (
          adding ? (
            <div className="w-[200px]">
              <GameSearchCombobox onSelect={handleAdd} />
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="mt-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={cn(
                "flex flex-col items-center justify-center rounded-sm border border-dashed border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-all",
                "w-[72px] h-[96px] sm:w-[85px] sm:h-[113px]"
              )}
            >
              <Search className="h-4 w-4 mb-1" />
              <span className="text-[8px] font-medium uppercase tracking-wider">Add</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

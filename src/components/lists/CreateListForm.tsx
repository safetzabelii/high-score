"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Loader2, Globe, Lock, Search, X, Gamepad2, Plus } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useGameSearch, type GameSearchResult } from "@/hooks/useGameSearch"

interface SelectedGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
}

export function CreateListForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [games, setGames] = useState<SelectedGame[]>([])
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { query, setQuery, results, isLoading, clear } = useGameSearch(300)

  const addGame = useCallback((game: GameSearchResult) => {
    const id = game.igdb_id ?? game.id ?? Number(game.objectID)
    if (games.some(g => g.id === id)) {
      toast.error("Already in list")
      return
    }
    setGames(prev => [...prev, {
      id,
      title: game.title,
      slug: game.slug,
      cover_url: game.cover_url,
      release_year: game.release_year,
    }])
    clear()
  }, [games, clear])

  const removeGame = useCallback((id: number) => {
    setGames(prev => prev.filter(g => g.id !== id))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data, error } = await (supabase.from("lists") as any)
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        })
        .select("id")
        .single()

      if (error) throw error

      if (games.length > 0) {
        for (const game of games) {
          await (supabase.from("games") as any).upsert({
            id: game.id,
            title: game.title,
            slug: game.slug,
            cover_url: game.cover_url,
            release_year: game.release_year,
          }, { onConflict: "id" })
        }

        const items = games.map((game, i) => ({
          list_id: data.id,
          game_id: game.id,
          position: i,
        }))
        const { error: itemsError } = await (supabase.from("list_items") as any).insert(items)
        if (itemsError) console.error("Failed to add games:", itemsError)
      }

      toast.success("List created!")
      router.push(`/lists/${data.id}`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create list")
    } finally {
      setSaving(false)
    }
  }

  const showResults = query.length >= 2 && searchFocused

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Cinematic Header ── */}
      <div className="relative mb-10 pb-8 border-b border-zinc-800/60">
        <div className="flex items-baseline gap-4">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-500">NEW LIST</span>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-50 tracking-tight leading-none">
            Create a List
          </h1>
        </div>
        <p className="mt-3 text-sm text-zinc-500 max-w-md">
          Curate your collection. Add games, rank them, share with the world.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ── Left: Form Details (5 cols) ── */}
        <div className="lg:col-span-5 space-y-7">
          {/* Title field */}
          <div>
            <label htmlFor="title" className="section-heading mb-3 block text-zinc-500">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Top 10 RPGs, Best of 2024..."
              maxLength={100}
              className="w-full border-0 border-b-2 border-zinc-700/60 bg-transparent px-0 py-3 text-xl font-medium text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="section-heading mb-3 block text-zinc-500">
              Description <span className="normal-case tracking-normal text-zinc-700">— optional</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="What makes this list special?"
              className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500/60 focus:bg-zinc-900/60 transition-all resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="section-heading mb-3 block text-zinc-500">
              Visibility
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={cn(
                  "relative flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all border overflow-hidden",
                  isPublic
                    ? "border-zinc-500/50 text-zinc-200"
                    : "border-zinc-800/60 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                )}
              >
                {isPublic && <div className="absolute inset-0 bg-zinc-500/8" />}
                <Globe className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Public</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={cn(
                  "relative flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all border overflow-hidden",
                  !isPublic
                    ? "border-zinc-500/50 text-zinc-200"
                    : "border-zinc-800/60 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                )}
              >
                {!isPublic && <div className="absolute inset-0 bg-zinc-500/8" />}
                <Lock className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Private</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-7 py-3 text-sm font-bold tracking-wide uppercase transition-all overflow-hidden",
                title.trim()
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "bg-zinc-800/60 text-zinc-600 cursor-not-allowed"
              )}
            >
              {title.trim() && (
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-600 to-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              {saving ? (
                <span className="relative z-10 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="relative z-10">Create List</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-3 block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── Right: Game Selection (7 cols) ── */}
        <div className="lg:col-span-7">
          {/* Search bar */}
          <div className="relative mb-5">
            <label className="section-heading mb-3 block text-zinc-500">
              Games
              {games.length > 0 && (
                <span className="ml-2 font-mono text-zinc-400 tabular-nums">{games.length}</span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Search games to add..."
                className="w-full border-0 border-b-2 border-zinc-800/60 bg-transparent pl-7 pr-8 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500/60 transition-colors"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search results */}
            {showResults && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-zinc-800/80 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 max-h-72 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400/60" />
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-600">
                    No games found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <ul className="py-1">
                    {results.map((game, i) => {
                      const id = game.igdb_id ?? game.id ?? Number(game.objectID)
                      const alreadyAdded = games.some(g => g.id === id)
                      return (
                        <li key={game.objectID ?? game.id ?? i}>
                          <button
                            type="button"
                            onClick={() => addGame(game)}
                            disabled={alreadyAdded}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all",
                              alreadyAdded
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:bg-zinc-500/8"
                            )}
                          >
                            <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30">
                              {game.cover_url ? (
                                <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="32px" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                  <Gamepad2 className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-zinc-200">{game.title}</p>
                              <p className="truncate text-[11px] text-zinc-600">
                                {[game.release_year, game.developer].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            {alreadyAdded ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400/50 flex-shrink-0">Added</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-zinc-700 flex-shrink-0">
                                <Plus className="h-3 w-3" />
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Selected games — poster grid */}
          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800/60 rounded-lg">
              <Gamepad2 className="h-8 w-8 text-zinc-800 mb-3" />
              <p className="text-sm text-zinc-600">Your list is empty</p>
              <p className="text-[11px] text-zinc-700 mt-1">Search above to start adding games</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {games.map((game, i) => (
                <div
                  key={game.id}
                  className="group relative animate-in fade-in slide-in-from-bottom-2 duration-200"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover">
                    {game.cover_url ? (
                      <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="120px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-700">
                        <Gamepad2 className="h-4 w-4" />
                      </div>
                    )}
                    {/* Rank number */}
                    <div className="absolute bottom-1 left-1.5 font-mono text-[10px] font-bold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums">
                      #{i + 1}
                    </div>
                    {/* Remove on hover */}
                    <button
                      type="button"
                      onClick={() => removeGame(game.id)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-zinc-950/80 backdrop-blur-sm text-zinc-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600 truncate leading-tight">{game.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}

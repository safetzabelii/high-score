"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { X, ChevronLeft, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase/client"
import { GameSearchCombobox } from "../shared/GameSearchComboBox"
import { StarRating } from "../shared/StarRating"
import { cn } from "../../lib/utils"

type GameStatus = "played" | "playing" | "backlog" | "abandoned"

export interface GameSearchResult {
  objectID?: string
  igdb_id?: number
  id?: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
  platforms?: string[]
  genres?: string[]
  developer?: string | null
  rating?: number | null
}

interface LogGameModalProps {
  open: boolean
  onClose: () => void
  preselectedGame?: GameSearchResult
}

const STATUS_OPTIONS: { value: GameStatus; label: string; emoji: string }[] = [
  { value: "played",    label: "Played",    emoji: "✅" },
  { value: "playing",   label: "Playing",   emoji: "🎮" },
  { value: "backlog",   label: "Backlog",   emoji: "📋" },
  { value: "abandoned", label: "Abandoned", emoji: "💀" },
]

const PLATFORM_OPTIONS = [
  "PC", "PS5", "PS4", "Xbox Series X|S", "Xbox One",
  "Switch", "iOS", "Android", "Steam Deck",
]

export function LogGameModal({ open, onClose, preselectedGame }: LogGameModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const [step,      setStep]      = useState<1 | 2>(preselectedGame ? 2 : 1)
  const [game,      setGame]      = useState<GameSearchResult | null>(preselectedGame ?? null)
  const [isLoading, setIsLoading] = useState(false)

  const [rating,           setRating]           = useState<number | null>(null)
  const [status,           setStatus]           = useState<GameStatus>("played")
  const [reviewText,       setReviewText]       = useState("")
  const [platforms,        setPlatforms]        = useState<string[]>([])
  const [playtime,         setPlaytime]         = useState("")
  const [containsSpoilers, setContainsSpoilers] = useState(false)
  const [loggedDate,       setLoggedDate]       = useState(
    new Date().toISOString().split("T")[0]
  )

  // Portal needs to be mounted client-side
  useEffect(() => { setMounted(true) }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep(preselectedGame ? 2 : 1)
      setGame(preselectedGame ?? null)
      resetForm()
    }, 200)
  }

  function resetForm() {
    setRating(null)
    setStatus("played")
    setReviewText("")
    setPlatforms([])
    setPlaytime("")
    setContainsSpoilers(false)
    setLoggedDate(new Date().toISOString().split("T")[0])
  }

  function handleGameSelect(selected: GameSearchResult) {
    setGame(selected)
    setStep(2)
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!game) return
    setIsLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error("You must be logged in to log a game.")
        return
      }

      const gameId = game.igdb_id ?? game.id ?? Number(game.objectID)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: gameError } = await (supabase.from("games") as any).upsert({
        id: gameId, title: game.title, slug: game.slug,
        cover_url: game.cover_url, release_year: game.release_year,
      }, { onConflict: "id" })
      if (gameError) throw gameError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: logError } = await (supabase.from("game_logs") as any).upsert({
        user_id: user.id, game_id: gameId, rating,
        status, review_text: reviewText.trim() || null,
        contains_spoilers: containsSpoilers, platforms,
        playtime_hours: playtime ? parseInt(playtime, 10) : null,
        logged_date: loggedDate,
      }, { onConflict: "user_id,game_id" })
      if (logError) throw logError

      toast.success(`${game.title} logged!`)
      handleClose()
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted || !open) return null

  const modalContent = (
    // This renders directly into document.body — escapes all z-index/overflow traps
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: -1 }}
        className="bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal panel — no overflow on step 1 so dropdown is not clipped */}
      <div className={`relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 ${step === 2 ? "max-h-[90vh] overflow-y-auto" : ""}`}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            {step === 2 && !preselectedGame && (
              <button type="button" onClick={() => { setStep(1); setGame(null) }}
                className="mr-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-semibold text-zinc-100">
              {step === 1 ? "Log a Game" : "Log Entry"}
            </h2>
          </div>
          <button type="button" onClick={handleClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1 — Search — extra bottom padding gives the dropdown room */}
        {step === 1 && (
          <div className="p-6 pb-64">
            <p className="mb-4 text-sm text-zinc-400">Search for the game you want to log.</p>
            <GameSearchCombobox onSelect={handleGameSelect} />
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && game && (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">

              {/* Game header */}
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-lg">
                  {game.cover_url ? (
                    <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="48px" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-600 text-xs">?</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-zinc-100 leading-tight">{game.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[game.release_year, game.developer].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Your Rating</label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all",
                        status === opt.value
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      )}>
                      <span>{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Platform(s)</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        platforms.includes(p)
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      )}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Review <span className="text-zinc-600 normal-case">(optional)</span>
                </label>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What did you think? (Markdown supported)" rows={4}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors"
                />
                {reviewText.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={containsSpoilers}
                      onChange={(e) => setContainsSpoilers(e.target.checked)}
                      className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500" />
                    <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      Contains spoilers
                    </span>
                  </label>
                )}
              </div>

              {/* Playtime + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Playtime (hrs)
                  </label>
                  <input type="number" min="0" max="9999" value={playtime}
                    onChange={(e) => setPlaytime(e.target.value)} placeholder="e.g. 42"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Date Played</label>
                  <input type="date" value={loggedDate} onChange={(e) => setLoggedDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors [color-scheme:dark]" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-end gap-3">
              <button type="button" onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Saving…" : "Save Log"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
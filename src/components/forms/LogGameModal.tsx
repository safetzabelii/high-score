"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { X, ChevronLeft, Clock, AlertTriangle, Loader2, Pencil, Check } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { GameSearchCombobox } from "@/components/shared/GameSearchComboBox"
import { StarRating } from "@/components/shared/StarRating"
import { cn } from "@/lib/utils"

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

/** Existing log data passed when editing from profile */
export interface ExistingLog {
  id: string
  rating: number | null
  status: GameStatus
  review_text: string | null
  platforms: string[]
  playtime_hours: number | null
  contains_spoilers: boolean
  logged_date: string
}

interface LogGameModalProps {
  open: boolean
  onClose: () => void
  preselectedGame?: GameSearchResult
  existingLog?: ExistingLog | null
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

export function LogGameModal({ open, onClose, preselectedGame, existingLog }: LogGameModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const isEditMode = !!existingLog
  const [isEditing, setIsEditing] = useState(!!existingLog)
  const [step, setStep] = useState<1 | 2>(preselectedGame ? 2 : 1)
  const [game, setGame] = useState<GameSearchResult | null>(preselectedGame ?? null)
  const [isLoading, setIsLoading] = useState(false)

  // Form fields
  const [rating,           setRating]           = useState<number | null>(existingLog?.rating ?? null)
  const [status,           setStatus]           = useState<GameStatus>(existingLog?.status ?? "played")
  const [reviewText,       setReviewText]       = useState(existingLog?.review_text ?? "")
  const [platforms,        setPlatforms]        = useState<string[]>(existingLog?.platforms ?? [])
  const [playtime,         setPlaytime]         = useState(existingLog?.playtime_hours?.toString() ?? "")
  const [containsSpoilers, setContainsSpoilers] = useState(existingLog?.contains_spoilers ?? false)
  const [loggedDate,       setLoggedDate]       = useState(
    existingLog?.logged_date ?? new Date().toISOString().split("T")[0]
  )

  const [fetchingExisting, setFetchingExisting] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  // When modal opens with existingLog, prefill form
  useEffect(() => {
    if (open && existingLog) {
      setRating(existingLog.rating)
      setStatus(existingLog.status)
      setReviewText(existingLog.review_text ?? "")
      setPlatforms(existingLog.platforms ?? [])
      setPlaytime(existingLog.playtime_hours?.toString() ?? "")
      setContainsSpoilers(existingLog.contains_spoilers)
      setLoggedDate(existingLog.logged_date)
      setIsEditing(true)
      setStep(2)
    }
  }, [open, existingLog])

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep(preselectedGame ? 2 : 1)
      setGame(preselectedGame ?? null)
      setIsEditing(!!existingLog)
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

  // After selecting a game from search, check if already logged
  const handleGameSelect = useCallback(async (selected: GameSearchResult) => {
    setGame(selected)
    setFetchingExisting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStep(2); return }

      const gameId = selected.igdb_id ?? selected.id ?? Number(selected.objectID)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: entry } = await (supabase
        .from("game_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("game_id", gameId)
        .single() as any)

      if (entry) {
        setRating(entry.rating)
        setStatus(entry.status as GameStatus)
        setReviewText(entry.review_text ?? "")
        setPlatforms(entry.platforms ?? [])
        setPlaytime(entry.playtime_hours?.toString() ?? "")
        setContainsSpoilers(entry.contains_spoilers)
        setLoggedDate(entry.logged_date)
        setIsEditing(true)
        toast.info(`You've already logged ${selected.title} — editing your entry.`)
      } else {
        setIsEditing(false)
        resetForm()
      }
    } catch {
      setIsEditing(false)
    } finally {
      setFetchingExisting(false)
      setStep(2)
    }
  }, [])

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

      toast.success(isEditing ? `${game.title} updated!` : `${game.title} logged!`)
      handleClose()
      router.refresh()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : "Something went wrong."
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!game) return
    const confirmed = window.confirm(`Remove ${game.title} from your log?`)
    if (!confirmed) return

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const gameId = game.igdb_id ?? game.id ?? Number(game.objectID)
      const { error } = await supabase
        .from("game_logs")
        .delete()
        .eq("user_id", user.id)
        .eq("game_id", gameId)
      if (error) throw error

      toast.success(`${game.title} removed from your log.`)
      handleClose()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete."
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted || !open) return null

  const today = new Date().toISOString().split("T")[0]

  const modalContent = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{ position: "fixed", inset: 0, zIndex: -1 }}
        className="bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className={cn(
        "relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60",
        step === 2 ? "max-h-[90vh] overflow-y-auto" : ""
      )}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            {step === 2 && !preselectedGame && !isEditMode && (
              <button type="button" onClick={() => { setStep(1); setGame(null); resetForm(); setIsEditing(false) }}
                className="mr-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              {step === 1 ? "Log a Game" : isEditing ? (
                <><Pencil className="h-3.5 w-3.5 text-indigo-400" /> Edit Log</>
              ) : "Log Entry"}
            </h2>
          </div>
          <button type="button" onClick={handleClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1 — Search */}
        {step === 1 && (
          <div className="p-6 pb-64">
            <p className="mb-4 text-sm text-zinc-400">Search for the game you want to log.</p>
            <GameSearchCombobox onSelect={handleGameSelect} />
          </div>
        )}

        {/* Loading existing log check */}
        {fetchingExisting && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your library...
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && game && !fetchingExisting && (
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 leading-tight truncate">{game.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[game.release_year, game.developer].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {isEditing && (
                  <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 text-xs font-medium text-indigo-300 flex-shrink-0">
                    <Check className="h-3 w-3" /> Logged
                  </span>
                )}
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
                  placeholder="What did you think?" rows={4}
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
                  <input type="number" min="1" max="9999" value={playtime}
                    onChange={(e) => setPlaytime(e.target.value)} placeholder="e.g. 42"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Date Played</label>
                  <input type="date" value={loggedDate} max={today}
                    onChange={(e) => setLoggedDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors [color-scheme:dark]" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div>
                {isEditing && (
                  <button type="button" onClick={handleDelete} disabled={isLoading}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                    Remove from log
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleClose}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isLoading ? "Saving..." : isEditing ? "Update Log" : "Save Log"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

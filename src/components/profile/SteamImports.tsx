"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, Gamepad2, X, ChevronDown, Trophy } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { StarRating } from "@/components/shared/StarRating"

interface SteamImportGame {
  id: string // log id
  game_id: number
  playtime_hours: number | null
  games: {
    id: number
    title: string
    slug: string
    cover_url: string | null
    release_year: number | null
  } | null
}

interface SteamImportsProps {
  imports: SteamImportGame[]
  userId: string
}

type QuickStatus = "played" | "completed"

export function SteamImports({ imports: initialImports, userId }: SteamImportsProps) {
  const router = useRouter()
  const [imports, setImports] = useState(initialImports)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(true)
  const [ratings, setRatings] = useState<Record<string, number | null>>({})

  const reviewedCount = initialImports.length - imports.length

  const handleQuickLog = useCallback(async (logId: string, status: QuickStatus) => {
    setProcessing(prev => new Set(prev).add(logId))
    try {
      const rating = ratings[logId] ?? null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("game_logs") as any)
        .update({ status, rating, import_source: null })
        .eq("id", logId)

      if (error) throw error

      setImports(prev => prev.filter(i => i.id !== logId))
      toast.success(`Marked as ${status}${rating ? ` — ${rating}/5` : ""}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to update")
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(logId)
        return next
      })
    }
  }, [ratings])

  const handleDismiss = useCallback(async (logId: string) => {
    setProcessing(prev => new Set(prev).add(logId))
    try {
      const { error } = await supabase
        .from("game_logs")
        .delete()
        .eq("id", logId)

      if (error) throw error
      setImports(prev => prev.filter(i => i.id !== logId))
    } catch (err) {
      console.error(err)
      toast.error("Failed to remove")
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(logId)
        return next
      })
    }
  }, [])

  const handleBulkAction = useCallback(async (status: QuickStatus) => {
    const remaining = imports.filter(i => !processing.has(i.id))
    if (remaining.length === 0) return

    const ids = remaining.map(i => i.id)
    setProcessing(new Set(ids))

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("game_logs") as any)
        .update({ status, import_source: null })
        .in("id", ids)

      if (error) throw error
      setImports([])
      toast.success(`Marked ${ids.length} games as ${status}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to bulk update")
    } finally {
      setProcessing(new Set())
    }
  }, [imports, processing, router])

  if (imports.length === 0 && reviewedCount === 0) return null

  return (
    <section className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <h2 className="section-heading">Steam Imports</h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">
          {imports.length} to review
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-zinc-600 transition-transform ml-auto",
          !expanded && "-rotate-90"
        )} />
      </button>

      {expanded && (
        <div className="mt-3 animate-in fade-in duration-200">
          <p className="text-[12px] text-zinc-500 mb-3">
            Rate your Steam imports and mark them as <strong className="text-zinc-300">Played</strong> or <strong className="text-zinc-300">Completed</strong>.
          </p>

          {/* Bulk actions */}
          {imports.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] text-zinc-500">Mark all as:</span>
              <button
                onClick={() => handleBulkAction("played")}
                className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded border border-zinc-700/50 hover:border-zinc-600 transition-colors"
              >
                Played
              </button>
              <button
                onClick={() => handleBulkAction("completed")}
                className="text-[11px] font-medium text-emerald-500/80 hover:text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
              >
                Completed
              </button>
            </div>
          )}

          {imports.length === 0 ? (
            <div className="py-6 text-center">
              <Check className="mx-auto h-6 w-6 text-emerald-500 mb-2" />
              <p className="text-[13px] text-zinc-400">All imports reviewed!</p>
            </div>
          ) : (
            <div className="grid gap-1">
              {imports.map((item) => {
                const game = item.games
                if (!game) return null
                const isLoading = processing.has(item.id)

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 py-2.5 px-3 rounded-lg border border-zinc-800/40 bg-zinc-900/20 hover:border-zinc-700/60 hover:bg-zinc-900/40 transition-all group",
                      isLoading && "opacity-50 pointer-events-none"
                    )}
                  >
                    {/* Cover */}
                    <Link
                      href={`/game/${game.slug}`}
                      className="relative h-[48px] w-[32px] flex-shrink-0 overflow-hidden rounded-[2px] bg-zinc-800 border border-zinc-700/30"
                    >
                      {game.cover_url ? (
                        <Image
                          src={game.cover_url}
                          alt={game.title}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Gamepad2 className="h-3 w-3 text-zinc-600" />
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/game/${game.slug}`}
                        className="text-[13px] font-medium text-zinc-200 hover:text-zinc-50 transition-colors truncate block"
                      >
                        {game.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        {game.release_year && <span>{game.release_year}</span>}
                        {item.playtime_hours != null && item.playtime_hours > 0 && (
                          <>
                            <span className="text-zinc-700">&middot;</span>
                            <span>{item.playtime_hours}h played</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex-shrink-0">
                      <StarRating
                        value={ratings[item.id] ?? null}
                        onChange={(r) => setRatings(prev => ({ ...prev, [item.id]: r }))}
                        size="sm"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleQuickLog(item.id, "played")}
                            title="Mark as Played"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 hover:border-zinc-600 transition-all cursor-pointer active:scale-95"
                          >
                            <Gamepad2 className="h-3 w-3" />
                            Played
                          </button>
                          <button
                            onClick={() => handleQuickLog(item.id, "completed")}
                            title="Mark as Completed"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all cursor-pointer active:scale-95"
                          >
                            <Trophy className="h-3 w-3" />
                            Completed
                          </button>
                          <button
                            onClick={() => handleDismiss(item.id)}
                            title="Remove — don't track this game"
                            className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

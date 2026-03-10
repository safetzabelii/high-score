"use client"

import { useState } from "react"
import { Plus, Check } from "lucide-react"
import { LogGameModal } from "@/components/forms/LogGameModal"
import type { GameSearchResult, ExistingLog } from "@/components/forms/LogGameModal"

interface GamePageActionsProps {
  game: GameSearchResult
  existingLog: ExistingLog | null
}

export function GamePageActions({ game, existingLog }: GamePageActionsProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          existingLog
            ? "inline-flex items-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-5 py-2.5 text-sm font-medium transition-all"
            : "inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 px-5 py-2.5 text-sm font-medium transition-all"
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

      <LogGameModal
        open={open}
        onClose={() => setOpen(false)}
        preselectedGame={game}
        existingLog={existingLog}
      />
    </>
  )
}

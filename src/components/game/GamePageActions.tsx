"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Plus, Check } from "lucide-react"
import type { GameSearchResult, ExistingLog } from "@/components/forms/LogGameModal"

const LogGameModal = dynamic(() => import("@/components/forms/LogGameModal").then(m => ({ default: m.LogGameModal })), { ssr: false })

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

      <LogGameModal
        open={open}
        onClose={() => setOpen(false)}
        preselectedGame={game}
        existingLog={existingLog}
      />
    </>
  )
}

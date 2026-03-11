"use client"

import { useState, useEffect } from "react"
import { useSpoilerStore } from "@/stores/spoilerStore"
import { EyeOff, Eye } from "lucide-react"

interface SpoilerGuardProps {
  containsSpoilers: boolean
  children: React.ReactNode
}

export function SpoilerGuard({ containsSpoilers, children }: SpoilerGuardProps) {
  const hideSpoilers = useSpoilerStore((s) => s.hideSpoilers)
  const [revealed, setRevealed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // If no spoilers or user disabled the filter, show content directly
  if (!containsSpoilers || !mounted || !hideSpoilers || revealed) {
    return <>{children}</>
  }

  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* Blurred content */}
      <div className="blur-md select-none pointer-events-none opacity-40" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="absolute inset-0 flex items-center justify-center gap-2.5 bg-zinc-900/70 backdrop-blur-sm rounded-lg border border-zinc-700/30 hover:border-zinc-600/40 transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-800/80 border border-zinc-700/50 group-hover:border-amber-500/30 group-hover:bg-zinc-800 transition-all">
          <EyeOff className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
            Contains spoilers — click to reveal
          </span>
        </div>
      </button>
    </div>
  )
}

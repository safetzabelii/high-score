"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { LogGameModal } from "@/components/forms/LogGameModal"
import { cn } from "@/lib/utils"

interface LogGameButtonProps {
  className?: string
  variant?: "default" | "compact"
}

export function LogGameButton({
  className,
  variant = "default",
}: LogGameButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg font-semibold transition-all active:scale-[0.97]",
          variant === "default" && [
            "bg-indigo-600 hover:bg-indigo-500 text-white",
            "px-3.5 py-2 text-sm shadow-lg shadow-indigo-600/25",
          ],
          variant === "compact" && [
            "bg-zinc-800 hover:bg-zinc-700 text-zinc-200",
            "px-3 py-1.5 text-xs",
          ],
          className
        )}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Log a Game</span>
        <span className="sm:hidden">Log</span>
      </button>

      <LogGameModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

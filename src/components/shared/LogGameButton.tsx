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
          "flex items-center gap-2 rounded-lg font-medium transition-all",
          variant === "default" && [
            "bg-indigo-600 hover:bg-indigo-500 text-white",
            "px-4 py-2 text-sm shadow-lg shadow-indigo-900/30",
          ],
          variant === "compact" && [
            "bg-zinc-800 hover:bg-zinc-700 text-zinc-200",
            "px-3 py-1.5 text-xs",
          ],
          className
        )}
      >
        <Plus className="h-4 w-4" />
        Log a Game
      </button>

      <LogGameModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
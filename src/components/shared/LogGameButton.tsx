"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const LogGameModal = dynamic(() => import("@/components/forms/LogGameModal").then(m => ({ default: m.LogGameModal })), { ssr: false })

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
          "flex items-center gap-1.5 font-bold uppercase tracking-wide transition-all active:scale-[0.97]",
          variant === "default" && [
            "bg-hs-green-button hover:bg-hs-green-hover text-white",
            "px-3 py-1.5 text-[11px] rounded-sm",
          ],
          variant === "compact" && [
            "bg-zinc-800 hover:bg-zinc-700 text-zinc-200",
            "px-3 py-1.5 text-[11px] rounded-sm",
          ],
          className
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Log</span>
      </button>

      <LogGameModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

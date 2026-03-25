"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Ban, MoreHorizontal, ShieldOff } from "lucide-react"
import { toast } from "sonner"

interface BlockButtonProps {
  targetUserId: string
  currentUserId: string
  initialBlocked: boolean
}

export function BlockButton({
  targetUserId,
  currentUserId,
  initialBlocked,
}: BlockButtonProps) {
  const router = useRouter()
  const [blocked, setBlocked] = useState(initialBlocked)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick)
    }
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleBlock() {
    if (loading) return
    setLoading(true)
    setOpen(false)

    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      })
      if (!res.ok) throw new Error()
      setBlocked(true)
      toast.success("User blocked")
      router.refresh()
    } catch {
      toast.error("Failed to block user")
    } finally {
      setLoading(false)
    }
  }

  async function handleUnblock() {
    if (loading) return
    setLoading(true)
    setOpen(false)

    try {
      const res = await fetch("/api/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      })
      if (!res.ok) throw new Error()
      setBlocked(false)
      toast.success("User unblocked")
      router.refresh()
    } catch {
      toast.error("Failed to unblock user")
    } finally {
      setLoading(false)
    }
  }

  if (currentUserId === targetUserId) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-8 w-8 rounded-sm border border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
        aria-label="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-zinc-700/50 bg-zinc-900 py-1 shadow-lg">
          {blocked ? (
            <button
              type="button"
              onClick={handleUnblock}
              disabled={loading}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Unblock
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBlock}
              disabled={loading}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-400 hover:bg-zinc-800 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              Block
            </button>
          )}
        </div>
      )}
    </div>
  )
}

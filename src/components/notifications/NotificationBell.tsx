"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)

      setUnreadCount(count ?? 0)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        unreadCount > 0
          ? "text-zinc-200 bg-zinc-800/40"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
      )}
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-indigo-500/30 animate-in zoom-in-50">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  )
}

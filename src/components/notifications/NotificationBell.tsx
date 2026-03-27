"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, Heart, UserPlus, MessageCircle, User as UserIcon, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "like" | "follow" | "comment"
  read: boolean
  created_at: string
  log_id: string | null
  actor: {
    username: string
    display_name: string
    avatar_url: string | null
  } | null
  game_title?: string
  game_slug?: string
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function fetchNotifications() {
    if (fetched) return
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: rawNotifs } = await (supabase
        .from("notifications")
        .select("*, actor:users!notifications_actor_id_fkey(username, display_name, avatar_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8) as any)

      const notifs = (rawNotifs ?? []) as Notification[]

      // Fetch game info for like/comment notifs
      const logIds = notifs
        .filter((n) => (n.type === "like" || n.type === "comment") && n.log_id)
        .map((n) => n.log_id!)

      if (logIds.length > 0) {
        const { data: logs } = await (supabase
          .from("game_logs")
          .select("id, games(title, slug)")
          .in("id", logIds) as any)

        const logMap = new Map<string, { title: string; slug: string }>()
        for (const log of (logs ?? []) as any[]) {
          if (log.games) logMap.set(log.id, log.games)
        }

        for (const n of notifs) {
          if (n.log_id && logMap.has(n.log_id)) {
            const game = logMap.get(n.log_id)!
            n.game_title = game.title
            n.game_slug = game.slug
          }
        }
      }

      setNotifications(notifs)
      setFetched(true)

      // Mark as read
      const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id)
      if (unreadIds.length > 0) {
        await (supabase.from("notifications") as any)
          .update({ read: true })
          .in("id", unreadIds)
        setUnreadCount(0)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) fetchNotifications()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          unreadCount > 0 || open
            ? "text-zinc-200 bg-zinc-800/40"
            : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-hs-green-hover px-1 text-[10px] font-bold text-white shadow-lg animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">Notifications</h3>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              See All
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-6 w-6 text-zinc-800 mb-2" />
                <p className="text-xs text-zinc-600">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif) => {
                  if (!notif.actor) return null
                  const isLike = notif.type === "like"
                  const isComment = notif.type === "comment"

                  return (
                    <Link
                      key={notif.id}
                      href={
                        notif.type === "follow"
                          ? `/profile/${notif.actor.username}`
                          : notif.game_slug
                          ? `/game/${notif.game_slug}`
                          : "#"
                      }
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-start gap-2.5 px-4 py-2.5 hover:bg-zinc-900/60 transition-colors",
                        !notif.read && "bg-zinc-900/30"
                      )}
                    >
                      {/* Type icon */}
                      <div className={cn(
                        "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                        isLike ? "bg-rose-500/10 text-rose-400" :
                        isComment ? "bg-amber-500/10 text-amber-400" :
                        "bg-emerald-500/10 text-emerald-400"
                      )}>
                        {isLike ? <Heart className="h-3 w-3" /> : isComment ? <MessageCircle className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                      </div>

                      {/* Avatar */}
                      <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 border border-zinc-700/50">
                        {notif.actor.avatar_url ? (
                          <Image src={notif.actor.avatar_url} alt="" fill className="object-cover" sizes="24px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserIcon className="h-3 w-3 text-zinc-600" />
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-zinc-400 leading-snug">
                          <span className="font-semibold text-zinc-300">{notif.actor.display_name}</span>
                          {" "}
                          {isLike ? "liked your log" : isComment ? "commented on your review" : "followed you"}
                          {notif.game_title && (
                            <span className="text-zinc-500"> for <span className="text-zinc-300">{notif.game_title}</span></span>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-700 mt-0.5">{formatTimeAgo(notif.created_at)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-zinc-800/60 px-4 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                View All Notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

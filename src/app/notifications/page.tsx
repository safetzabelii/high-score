import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Bell, Heart, UserPlus, MessageCircle, User as UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { NotificationRow, UserRow } from "@/types/database"

export const metadata = {
  title: "Notifications — HIGH-SCORE",
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/notifications")

  // Fetch notifications with actor info
  const { data: rawNotifications } = await (supabase
    .from("notifications")
    .select("*, actor:users!notifications_actor_id_fkey(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50) as any)

  type NotifWithActor = NotificationRow & { actor: UserRow | null }
  const notifications = (rawNotifications ?? []) as NotifWithActor[]

  // For like/comment notifications, fetch the related game info
  const logIds = notifications
    .filter((n) => (n.type === "like" || n.type === "comment") && n.log_id)
    .map((n) => n.log_id!)

  let logGameMap = new Map<string, { title: string; slug: string }>()
  if (logIds.length > 0) {
    const { data: logs } = await (supabase
      .from("game_logs")
      .select("id, games(title, slug)")
      .in("id", logIds) as any)

    for (const log of (logs ?? []) as { id: string; games: { title: string; slug: string } | null }[]) {
      if (log.games) {
        logGameMap.set(log.id, log.games)
      }
    }
  }

  // Mark all as read (fire-and-forget)
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
  if (unreadIds.length > 0) {
    await (supabase.from("notifications") as any)
      .update({ read: true })
      .in("id", unreadIds)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => {
            const actor = notif.actor
            if (!actor) return null

            const game = notif.log_id ? logGameMap.get(notif.log_id) : null
            const isLike = notif.type === "like"
            const isFollow = notif.type === "follow"
            const isComment = notif.type === "comment"

            const iconClass = isLike
              ? "bg-rose-500/10 text-rose-400"
              : isComment
              ? "bg-amber-500/10 text-amber-400"
              : "bg-hs-green/10 text-hs-green"

            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                  !notif.read ? "bg-hs-green/5 border border-hs-green/20" : "hover:bg-zinc-900/50"
                }`}
              >
                {/* Icon */}
                <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                  {isLike ? <Heart className="h-4 w-4" /> : isComment ? <MessageCircle className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </div>

                {/* Avatar */}
                <Link href={`/profile/${actor.username}`} className="flex-shrink-0">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                    {actor.avatar_url ? (
                      <Image
                        src={actor.avatar_url}
                        alt={actor.display_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">
                    <Link
                      href={`/profile/${actor.username}`}
                      className="font-medium text-zinc-100 hover:text-zinc-50"
                    >
                      {actor.display_name}
                    </Link>{" "}
                    {isLike ? (
                      <>
                        liked your log
                        {game && (
                          <>
                            {" "}for{" "}
                            <Link
                              href={`/game/${game.slug}`}
                              className="font-medium text-hs-green hover:text-emerald-300"
                            >
                              {game.title}
                            </Link>
                          </>
                        )}
                      </>
                    ) : isComment ? (
                      <>
                        commented on your review
                        {game && (
                          <>
                            {" "}for{" "}
                            <Link
                              href={`/game/${game.slug}`}
                              className="font-medium text-hs-green hover:text-emerald-300"
                            >
                              {game.title}
                            </Link>
                          </>
                        )}
                      </>
                    ) : (
                      "started following you"
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {formatTimeAgo(notif.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
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
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

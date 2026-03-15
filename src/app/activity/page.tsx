import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Clock, Gamepad2, Heart, MessageCircle, UserPlus, User as UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { GameLogRow, GameRow, UserRow, LikeRow, CommentRow, FollowRow } from "@/types/database"

export const metadata = {
  title: "Activity — HIGH-SCORE",
}

type ActivityItem =
  | { type: "log"; date: string; log: GameLogRow & { games: GameRow } }
  | { type: "like"; date: string; like: LikeRow & { game_logs: { games: GameRow } } }
  | { type: "comment"; date: string; comment: CommentRow & { game_logs: { games: GameRow } } }
  | { type: "follow"; date: string; follow: FollowRow & { users: UserRow } }

export default async function ActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/activity")

  // Fetch all activity types in parallel
  const [logsRes, likesRes, commentsRes, followsRes] = await Promise.all([
    (supabase
      .from("game_logs")
      .select("*, games(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50) as any),
    (supabase
      .from("likes")
      .select("*, game_logs(games(title, slug, cover_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30) as any),
    (supabase
      .from("comments")
      .select("*, game_logs(games(title, slug, cover_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30) as any),
    (supabase
      .from("follows")
      .select("*, users!follows_following_id_fkey(username, display_name, avatar_url)")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30) as any),
  ])

  // Merge into a single timeline
  const activities: ActivityItem[] = []

  for (const log of (logsRes.data ?? []) as (GameLogRow & { games: GameRow })[]) {
    if (log.games) activities.push({ type: "log", date: log.created_at, log })
  }
  for (const like of (likesRes.data ?? []) as any[]) {
    if (like.game_logs?.games) activities.push({ type: "like", date: like.created_at, like })
  }
  for (const comment of (commentsRes.data ?? []) as any[]) {
    if (comment.game_logs?.games) activities.push({ type: "comment", date: comment.created_at, comment })
  }
  for (const follow of (followsRes.data ?? []) as any[]) {
    if (follow.users) activities.push({ type: "follow", date: follow.created_at, follow })
  }

  // Sort by date descending
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Group by date
  const grouped = new Map<string, ActivityItem[]>()
  for (const item of activities) {
    const day = new Date(item.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    if (!grouped.has(day)) grouped.set(day, [])
    grouped.get(day)!.push(item)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-zinc-400" />
        <h1 className="text-2xl font-bold text-zinc-50">Your Activity</h1>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No activity yet. Start logging games!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([day, items]) => (
            <div key={day}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 sticky top-16 bg-zinc-950 py-1 z-10">
                {day}
              </h2>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <ActivityRow key={`${item.type}-${i}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const time = new Date(item.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  switch (item.type) {
    case "log": {
      const { log } = item
      const statusLabel: Record<string, string> = {
        played: "Logged",
        playing: "Started playing",
        backlog: "Added to backlog",
        abandoned: "Shelved",
      }
      return (
        <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-zinc-900/50 transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-hs-green/10 text-hs-green">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <Link
            href={`/game/${log.games.slug}`}
            className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-zinc-800"
          >
            {log.games.cover_url ? (
              <Image
                src={log.games.cover_url}
                alt={log.games.title}
                fill
                className="object-cover"
                sizes="28px"
                unoptimized
              />
            ) : null}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">{statusLabel[log.status] ?? "Logged"}</span>{" "}
              <Link
                href={`/game/${log.games.slug}`}
                className="font-medium text-zinc-100 hover:text-zinc-50"
              >
                {log.games.title}
              </Link>
              {log.rating != null && log.rating > 0 && (
                <span className="ml-1.5 text-yellow-500 text-xs">{"★".repeat(Math.round(log.rating))}</span>
              )}
            </p>
          </div>
          <span className="text-xs text-zinc-600 flex-shrink-0">{time}</span>
        </div>
      )
    }

    case "like": {
      const game = item.like.game_logs.games
      return (
        <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-zinc-900/50 transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <Heart className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">Liked a review for</span>{" "}
              <Link
                href={`/game/${game.slug}`}
                className="font-medium text-zinc-100 hover:text-zinc-50"
              >
                {game.title}
              </Link>
            </p>
          </div>
          <span className="text-xs text-zinc-600 flex-shrink-0">{time}</span>
        </div>
      )
    }

    case "comment": {
      const game = item.comment.game_logs.games
      return (
        <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-zinc-900/50 transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">Commented on a review for</span>{" "}
              <Link
                href={`/game/${game.slug}`}
                className="font-medium text-zinc-100 hover:text-zinc-50"
              >
                {game.title}
              </Link>
            </p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{item.comment.text}</p>
          </div>
          <span className="text-xs text-zinc-600 flex-shrink-0">{time}</span>
        </div>
      )
    }

    case "follow": {
      const u = item.follow.users
      return (
        <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-zinc-900/50 transition-colors">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-hs-green/10 text-hs-green">
            <UserPlus className="h-4 w-4" />
          </div>
          <Link href={`/profile/${u.username}`} className="flex-shrink-0">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
              {u.avatar_url ? (
                <Image
                  src={u.avatar_url}
                  alt={u.display_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserIcon className="h-3.5 w-3.5 text-zinc-600" />
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">Followed</span>{" "}
              <Link
                href={`/profile/${u.username}`}
                className="font-medium text-zinc-100 hover:text-zinc-50"
              >
                {u.display_name}
              </Link>
            </p>
          </div>
          <span className="text-xs text-zinc-600 flex-shrink-0">{time}</span>
        </div>
      )
    }
  }
}

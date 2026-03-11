import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { GameLogRow, GameRow, UserRow } from "@/types/database"

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cursor = request.nextUrl.searchParams.get("cursor") // ISO timestamp
  const pageSize = PAGE_SIZE

  // Get who the user follows
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)

  const followingIds = (following ?? []).map((f) => f.following_id)
  const feedUserIds = [...followingIds, user.id]

  // Fetch game logs
  let query = (supabase
    .from("game_logs")
    .select("*, users(*), games(*)")
    .in("user_id", feedUserIds)
    .order("created_at", { ascending: false })
    .limit(pageSize + 1) as any) // +1 to detect if there's more

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data: rawFeed } = await query

  type FeedRow = GameLogRow & { users: UserRow; games: GameRow }
  const allRows = (rawFeed ?? []) as FeedRow[]
  const hasMore = allRows.length > pageSize
  const feedLogs = hasMore ? allRows.slice(0, pageSize) : allRows

  // Fetch like + comment data
  const logIds = feedLogs.filter((l) => l.users && l.games).map((l) => l.id)

  const [likesRes, userLikesRes, commentsRes] = await Promise.all([
    (supabase
      .from("likes")
      .select("log_id")
      .in("log_id", logIds.length > 0 ? logIds : [""]) as any),
    supabase
      .from("likes")
      .select("log_id")
      .eq("user_id", user.id)
      .in("log_id", logIds.length > 0 ? logIds : [""]),
    (supabase
      .from("comments")
      .select("log_id")
      .in("log_id", logIds.length > 0 ? logIds : [""]) as any),
  ])

  const likeCountMap = new Map<string, number>()
  for (const like of (likesRes.data ?? []) as { log_id: string }[]) {
    likeCountMap.set(like.log_id, (likeCountMap.get(like.log_id) ?? 0) + 1)
  }

  const likedSet = new Set((userLikesRes.data ?? []).map((l) => l.log_id))

  const commentCountMap = new Map<string, number>()
  for (const c of (commentsRes.data ?? []) as { log_id: string }[]) {
    commentCountMap.set(c.log_id, (commentCountMap.get(c.log_id) ?? 0) + 1)
  }

  const entries = feedLogs
    .filter((log) => log.users && log.games)
    .map((log) => ({
      id: log.id,
      rating: log.rating,
      status: log.status,
      review_text: log.review_text,
      contains_spoilers: log.contains_spoilers,
      platforms: log.platforms,
      playtime_hours: log.playtime_hours,
      logged_date: log.logged_date,
      created_at: log.created_at,
      user_id: log.user_id,
      username: log.users.username,
      display_name: log.users.display_name,
      avatar_url: log.users.avatar_url,
      game_id: log.game_id,
      game_title: log.games.title,
      cover_url: log.games.cover_url,
      game_slug: log.games.slug,
      likeCount: likeCountMap.get(log.id) ?? 0,
      likedByMe: likedSet.has(log.id),
      commentCount: commentCountMap.get(log.id) ?? 0,
    }))

  const nextCursor = hasMore
    ? feedLogs[feedLogs.length - 1].created_at
    : null

  return NextResponse.json({ entries, nextCursor })
}

import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { StatsCharts } from "@/components/stats/StatsCharts"
import type { GameLogRow, GameRow } from "@/types/database"

export const metadata: Metadata = {
  title: "My Stats — HIGH-SCORE",
}

export default async function StatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/stats")

  // Fetch all user's game logs with game data
  const { data: rawLogs } = await (supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", user.id)
    .order("logged_date", { ascending: true }) as any)

  type LogWithGame = GameLogRow & { games: GameRow }
  const logs = (rawLogs ?? []) as LogWithGame[]

  // --- Compute stats server-side ---

  // 1. Rating distribution (0.5, 1.0, 1.5 ... 5.0)
  const ratingDist: Record<string, number> = {}
  for (let r = 0.5; r <= 5; r += 0.5) {
    ratingDist[r.toFixed(1)] = 0
  }
  for (const log of logs) {
    if (log.rating != null && log.rating > 0) {
      const key = log.rating.toFixed(1)
      ratingDist[key] = (ratingDist[key] ?? 0) + 1
    }
  }

  // 2. Status breakdown
  const statusCounts: Record<string, number> = {
    played: 0,
    playing: 0,
    completed: 0,
    backlog: 0,
    wishlist: 0,
    abandoned: 0,
  }
  for (const log of logs) {
    statusCounts[log.status] = (statusCounts[log.status] ?? 0) + 1
  }

  // 3. Monthly activity (last 12 months)
  const now = new Date()
  const monthlyActivity: { month: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    const count = logs.filter((l) => l.logged_date.startsWith(key)).length
    monthlyActivity.push({ month: label, count })
  }

  // 4. Platform distribution
  const platformCounts: Record<string, number> = {}
  for (const log of logs) {
    for (const plat of log.platforms) {
      platformCounts[plat] = (platformCounts[plat] ?? 0) + 1
    }
  }
  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // 5. Average rating
  const rated = logs.filter((l) => l.rating != null && l.rating > 0)
  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((s, l) => s + l.rating!, 0) / rated.length) * 10) / 10
      : null

  // 6. Total playtime
  const totalPlaytime = logs.reduce((s, l) => s + (l.playtime_hours ?? 0), 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">My Stats</h1>

      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No games logged yet. Start logging to see your stats!
        </p>
      ) : (
        <StatsCharts
          totalGames={logs.length}
          avgRating={avgRating}
          totalPlaytime={totalPlaytime}
          ratingDist={ratingDist}
          statusCounts={statusCounts}
          monthlyActivity={monthlyActivity}
          topPlatforms={topPlatforms}
        />
      )}
    </div>
  )
}

"use client"

import { Gamepad2, Heart, Clock, BarChart3 } from "lucide-react"

interface StatsChartsProps {
  totalGames: number
  avgRating: number | null
  totalPlaytime: number
  ratingDist: Record<string, number>
  statusCounts: Record<string, number>
  monthlyActivity: { month: string; count: number }[]
  topPlatforms: [string, number][]
}

const STATUS_COLORS: Record<string, string> = {
  played: "bg-emerald-500",
  playing: "bg-blue-500",
  completed: "bg-amber-500",
  backlog: "bg-yellow-500",
  wishlist: "bg-purple-500",
  abandoned: "bg-zinc-600",
}

const STATUS_LABELS: Record<string, string> = {
  played: "Played",
  playing: "Playing",
  completed: "Completed",
  backlog: "Backlog",
  wishlist: "Wishlist",
  abandoned: "Shelved",
}

export function StatsCharts({
  totalGames,
  avgRating,
  totalPlaytime,
  ratingDist,
  statusCounts,
  monthlyActivity,
  topPlatforms,
}: StatsChartsProps) {
  const maxRating = Math.max(...Object.values(ratingDist), 1)
  const maxMonthly = Math.max(...monthlyActivity.map((m) => m.count), 1)
  const maxPlatform = topPlatforms.length > 0 ? topPlatforms[0][1] : 1

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <Gamepad2 className="h-5 w-5 mx-auto mb-1 text-hs-green" />
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">{totalGames}</p>
          <p className="text-xs text-zinc-500">Games Logged</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <Heart className="h-5 w-5 mx-auto mb-1 fill-[#ff0055] text-[#ff0055]" />
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">
            {avgRating?.toFixed(1) ?? "—"}
          </p>
          <p className="text-xs text-zinc-500">Avg Rating</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">{totalPlaytime}</p>
          <p className="text-xs text-zinc-500">Hours Played</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <BarChart3 className="h-5 w-5 mx-auto mb-1 text-purple-400" />
          <p className="text-2xl font-bold text-zinc-100 tabular-nums">
            {statusCounts.played ?? 0}
          </p>
          <p className="text-xs text-zinc-500">Completed</p>
        </div>
      </div>

      {/* Rating distribution */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Rating Distribution</h2>
        <div className="flex items-end gap-1 h-32">
          {Object.entries(ratingDist).map(([rating, count]) => (
            <div key={rating} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-24">
                <div
                  className="w-full rounded-t bg-hs-green/80 transition-all min-h-[2px]"
                  style={{ height: `${(count / maxRating) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-600 tabular-nums">{rating}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Status Breakdown</h2>
        <div className="flex h-4 rounded-full overflow-hidden bg-zinc-800 mb-4">
          {Object.entries(statusCounts).map(([status, count]) =>
            count > 0 ? (
              <div
                key={status}
                className={`${STATUS_COLORS[status]} transition-all`}
                style={{ width: `${(count / totalGames) * 100}%` }}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[status]}`} />
              <span className="text-xs text-zinc-400">
                {STATUS_LABELS[status]} ({count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly activity */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Monthly Activity</h2>
        <div className="flex items-end gap-1 h-32">
          {monthlyActivity.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-24">
                {m.count > 0 && (
                  <span className="text-[9px] text-zinc-500 text-center tabular-nums mb-0.5">
                    {m.count}
                  </span>
                )}
                <div
                  className="w-full rounded-t bg-emerald-500/70 transition-all min-h-[2px]"
                  style={{ height: `${(m.count / maxMonthly) * 100}%` }}
                />
              </div>
              <span className="text-[8px] text-zinc-600">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top platforms */}
      {topPlatforms.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Top Platforms</h2>
          <div className="space-y-2">
            {topPlatforms.map(([plat, count]) => (
              <div key={plat} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-28 truncate">{plat}</span>
                <div className="flex-1 h-3 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500/70"
                    style={{ width: `${(count / maxPlatform) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 tabular-nums w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

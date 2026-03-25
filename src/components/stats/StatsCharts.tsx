"use client"

import { Heart } from "lucide-react"

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
  const completedCount = statusCounts.completed ?? 0

  return (
    <div className="space-y-10">
      {/* Inline summary stats */}
      <div className="flex items-center gap-3 text-[14px] flex-wrap pb-4 border-b border-zinc-800/60">
        <span className="text-zinc-400">
          <span className="font-bold text-zinc-100 tabular-nums text-lg">{totalGames}</span> Games
        </span>
        <span className="text-zinc-700">&middot;</span>
        {avgRating != null && (
          <>
            <span className="flex items-center gap-1 text-zinc-400">
              <Heart className="h-3.5 w-3.5 fill-[#ff0055] text-[#ff0055]" />
              <span className="font-bold text-zinc-100 tabular-nums text-lg">{avgRating.toFixed(1)}</span> Avg
            </span>
            <span className="text-zinc-700">&middot;</span>
          </>
        )}
        <span className="text-zinc-400">
          <span className="font-bold text-zinc-100 tabular-nums text-lg">{totalPlaytime.toLocaleString()}</span> Hours
        </span>
        <span className="text-zinc-700">&middot;</span>
        <span className="text-zinc-400">
          <span className="font-bold text-zinc-100 tabular-nums text-lg">{completedCount}</span> Completed
        </span>
      </div>

      {/* Rating distribution */}
      <section>
        <h2 className="section-heading mb-3">Rating distribution</h2>
        <div className="flex items-end gap-[3px] h-24">
          {Object.entries(ratingDist).map(([rating, count]) => (
            <div key={rating} className="flex-1 flex items-end h-full group">
              <div
                className="w-full bg-zinc-700 hover:bg-[#ff0055] transition-colors rounded-t-[1px]"
                style={{
                  height: count > 0 ? `${Math.max((count / maxRating) * 100, 4)}%` : "2px",
                  opacity: count > 0 ? 1 : 0.15,
                }}
                title={`${rating}: ${count} game${count !== 1 ? "s" : ""}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-zinc-600">½</span>
          <span className="text-[9px] text-zinc-600">★★★★★</span>
        </div>
      </section>

      {/* Status breakdown */}
      <section>
        <h2 className="section-heading mb-3">Status breakdown</h2>
        <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800 mb-3">
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
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
              <span className="text-[12px] text-zinc-400">
                {STATUS_LABELS[status]} <span className="text-zinc-600 tabular-nums">({count})</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly activity */}
      <section>
        <h2 className="section-heading mb-3">Monthly activity</h2>
        <div className="flex items-end gap-[3px] h-20">
          {monthlyActivity.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
              <div
                className="w-full bg-emerald-500/70 hover:bg-emerald-400 transition-colors rounded-t-[1px]"
                style={{
                  height: m.count > 0 ? `${Math.max((m.count / maxMonthly) * 100, 4)}%` : "2px",
                  opacity: m.count > 0 ? 1 : 0.15,
                }}
                title={`${m.month}: ${m.count} game${m.count !== 1 ? "s" : ""}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-zinc-600">{monthlyActivity[0]?.month}</span>
          <span className="text-[8px] text-zinc-600">{monthlyActivity[monthlyActivity.length - 1]?.month}</span>
        </div>
      </section>

      {/* Top platforms */}
      {topPlatforms.length > 0 && (
        <section>
          <h2 className="section-heading mb-3">Top platforms</h2>
          <div className="space-y-2">
            {topPlatforms.map(([plat, count]) => (
              <div key={plat} className="flex items-center gap-3">
                <span className="text-[12px] text-zinc-400 w-24 truncate">{plat}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500/60"
                    style={{ width: `${(count / maxPlatform) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-zinc-600 tabular-nums w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

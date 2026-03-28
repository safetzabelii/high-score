// src/app/game/[slug]/loading.tsx
// Skeleton screen shown instantly while game data loads.
// Matches the exact layout of the real game detail page so
// the transition is seamless — no layout shift.

export default function GameDetailLoading() {
  return (
    <div className="min-h-screen">
      {/* ─── Hero Backdrop skeleton ──────────────────────────── */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      </div>

      {/* ─── Content — two-column layout ─────────────────────── */}
      <div className="relative -mt-32 mx-auto max-w-[960px] px-4 pb-16">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* LEFT: Cover + Stats */}
          <div className="flex-shrink-0 w-[230px]">
            {/* Cover poster */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px] border border-zinc-700/30 shadow-2xl bg-zinc-900 skeleton-pulse" />

            {/* Stats bar */}
            <div className="flex items-center justify-between mt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 rounded bg-zinc-800 skeleton-pulse" />
                  <div className="h-3 w-5 rounded bg-zinc-800/60 skeleton-pulse" />
                </div>
              ))}
            </div>

            {/* Action button */}
            <div className="mt-5 space-y-3">
              <div className="h-10 w-full rounded-sm bg-zinc-800 skeleton-pulse" />
              <div className="h-9 w-full rounded-sm bg-zinc-800/60 skeleton-pulse" />
            </div>

            {/* Rating histogram placeholder */}
            <div className="mt-6">
              <div className="flex items-baseline gap-2 mb-2">
                <div className="h-3.5 w-14 rounded bg-zinc-800/50 skeleton-pulse" />
                <div className="h-3 w-10 rounded bg-zinc-800/30 skeleton-pulse" />
              </div>
              <div className="flex items-end gap-[2px] h-[50px]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-zinc-800/40 rounded-t-[1px] skeleton-pulse"
                    style={{ height: `${15 + Math.sin(i * 0.8) * 35 + 20}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-3 w-3 rounded bg-zinc-800/50 skeleton-pulse" />
                  ))}
                </div>
                <div className="h-5 w-8 rounded bg-zinc-800/40 skeleton-pulse" />
              </div>
            </div>
          </div>

          {/* RIGHT: Game info */}
          <div className="flex-1 min-w-0 pt-4 sm:pt-32">
            {/* Title */}
            <div className="h-9 w-3/4 rounded bg-zinc-800 skeleton-pulse" />

            {/* Year + developer */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-4 w-12 rounded bg-zinc-800/60 skeleton-pulse" />
              <div className="h-4 w-1 rounded bg-zinc-700/30" />
              <div className="h-4 w-40 rounded bg-zinc-800/50 skeleton-pulse" />
            </div>

            {/* Genre pills */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["w-16", "w-20", "w-14", "w-24"].map((w, i) => (
                <div
                  key={i}
                  className={`h-6 ${w} rounded-full bg-zinc-800/40 border border-zinc-700/20 skeleton-pulse`}
                />
              ))}
            </div>

            {/* Summary */}
            <div className="mt-5 space-y-2.5 max-w-2xl">
              <div className="h-[15px] w-full rounded bg-zinc-800/40 skeleton-pulse" />
              <div className="h-[15px] w-full rounded bg-zinc-800/40 skeleton-pulse" />
              <div className="h-[15px] w-full rounded bg-zinc-800/35 skeleton-pulse" />
              <div className="h-[15px] w-5/6 rounded bg-zinc-800/30 skeleton-pulse" />
              <div className="h-[15px] w-2/3 rounded bg-zinc-800/25 skeleton-pulse" />
            </div>

            {/* Platform pills */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["w-10", "w-8", "w-14", "w-12", "w-10"].map((w, i) => (
                <div
                  key={i}
                  className={`h-5 ${w} rounded bg-zinc-800/30 border border-zinc-700/20 skeleton-pulse`}
                />
              ))}
            </div>

          </div>
        </div>

        {/* ─── Community Reviews skeleton ────────────────────── */}
        <div className="mt-12">
          <div className="h-5 w-48 rounded bg-zinc-800/40 skeleton-pulse mb-4" />

          <div className="space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 py-5 border-b border-zinc-800/40"
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-zinc-800 skeleton-pulse flex-shrink-0" />
                {/* Review body */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-20 rounded bg-zinc-800/50 skeleton-pulse" />
                    <div className="flex gap-0.5">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-3 w-3 rounded bg-zinc-800/30 skeleton-pulse" />
                      ))}
                    </div>
                  </div>
                  <div className="h-3.5 w-full rounded bg-zinc-800/30 skeleton-pulse" />
                  <div className="h-3.5 w-4/5 rounded bg-zinc-800/25 skeleton-pulse" />
                  <div className="h-3.5 w-3/5 rounded bg-zinc-800/20 skeleton-pulse" />
                  {/* Like/comment counts */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="h-3 w-12 rounded bg-zinc-800/20 skeleton-pulse" />
                    <div className="h-3 w-8 rounded bg-zinc-800/20 skeleton-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .skeleton-pulse {
          animation: skeletonPulse 1.8s ease-in-out infinite;
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
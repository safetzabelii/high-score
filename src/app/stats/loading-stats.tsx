// src/app/lists/loading.tsx

export default function ListsLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-28 rounded bg-zinc-800 skeleton-pulse" />
        <div className="h-9 w-28 rounded-sm bg-zinc-800/60 skeleton-pulse" />
      </div>

      {/* List cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
          >
            {/* Stacked covers placeholder */}
            <div className="flex -space-x-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="h-20 w-14 rounded-[3px] bg-zinc-800/60 border border-zinc-700/30 skeleton-pulse"
                  style={{ zIndex: 4 - j }}
                />
              ))}
            </div>
            {/* Title */}
            <div className="h-5 w-3/4 rounded bg-zinc-800/50 skeleton-pulse" />
            {/* Description */}
            <div className="h-3.5 w-full rounded bg-zinc-800/30 skeleton-pulse" />
            {/* Meta */}
            <div className="flex items-center gap-3">
              <div className="h-3 w-16 rounded bg-zinc-800/20 skeleton-pulse" />
              <div className="h-3 w-20 rounded bg-zinc-800/20 skeleton-pulse" />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .skeleton-pulse { animation: skeletonPulse 1.8s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
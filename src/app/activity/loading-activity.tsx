// src/app/activity/loading.tsx

export default function ActivityLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8">
      {/* Title */}
      <div className="h-7 w-28 rounded bg-zinc-800 skeleton-pulse mb-6" />

      {/* Feed cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 py-4 border-b border-zinc-800/40"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-zinc-800 skeleton-pulse flex-shrink-0" />
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-3.5 w-24 rounded bg-zinc-800/50 skeleton-pulse" />
                <div className="h-3 w-16 rounded bg-zinc-800/30 skeleton-pulse" />
              </div>
              {/* Game card inline */}
              <div className="flex gap-3">
                <div className="h-[80px] w-[55px] rounded-[3px] bg-zinc-800/50 border border-zinc-700/20 skeleton-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-40 rounded bg-zinc-800/50 skeleton-pulse" />
                  <div className="h-3 w-20 rounded bg-zinc-800/30 skeleton-pulse" />
                  <div className="h-3 w-full rounded bg-zinc-800/20 skeleton-pulse" />
                  <div className="h-3 w-4/5 rounded bg-zinc-800/15 skeleton-pulse" />
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-4 mt-2">
                <div className="h-3 w-10 rounded bg-zinc-800/20 skeleton-pulse" />
                <div className="h-3 w-8 rounded bg-zinc-800/20 skeleton-pulse" />
              </div>
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
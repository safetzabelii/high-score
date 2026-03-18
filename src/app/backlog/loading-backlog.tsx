// src/app/backlog/loading.tsx

export default function BacklogLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-28 rounded bg-zinc-800 skeleton-pulse" />
        <div className="h-8 w-32 rounded bg-zinc-800/40 skeleton-pulse" />
      </div>

      {/* Backlog items list */}
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 border-b border-zinc-800/40"
          >
            {/* Cover */}
            <div className="h-[70px] w-[48px] rounded-[3px] bg-zinc-800/50 border border-zinc-700/20 skeleton-pulse flex-shrink-0" />
            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-48 rounded bg-zinc-800/50 skeleton-pulse" />
              <div className="h-3 w-24 rounded bg-zinc-800/30 skeleton-pulse" />
            </div>
            {/* Rating */}
            <div className="h-4 w-16 rounded bg-zinc-800/30 skeleton-pulse flex-shrink-0" />
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
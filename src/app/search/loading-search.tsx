// src/app/search/loading.tsx

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8">
      {/* Search bar */}
      <div className="h-12 w-full rounded-xl bg-zinc-900 border border-zinc-700 skeleton-pulse mb-6" />

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <div className="h-4 w-16 rounded bg-zinc-800/50 skeleton-pulse" />
        <div className="h-4 w-20 rounded bg-zinc-800/30 skeleton-pulse" />
      </div>

      {/* Results */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <div className="h-[70px] w-[48px] rounded-[3px] bg-zinc-800/50 border border-zinc-700/20 skeleton-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-zinc-800/50 skeleton-pulse" />
              <div className="h-3 w-32 rounded bg-zinc-800/30 skeleton-pulse" />
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-5 w-12 rounded bg-zinc-800/20 skeleton-pulse" />
                ))}
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
// src/app/discover/loading.tsx

export default function DiscoverLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="h-8 w-32 rounded bg-zinc-800 skeleton-pulse mb-6" />

      {/* Search bar */}
      <div className="h-12 w-full rounded-xl bg-zinc-900 border border-zinc-700 skeleton-pulse mb-8" />

      {/* Featured hero */}
      <div className="relative h-[320px] rounded-xl overflow-hidden bg-zinc-900 skeleton-pulse mb-10" />

      {/* Category rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-40 rounded bg-zinc-800/50 skeleton-pulse" />
            <div className="h-3 w-16 rounded bg-zinc-800/30 skeleton-pulse" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {Array.from({ length: 8 }).map((_, j) => (
              <div
                key={j}
                className="aspect-[3/4] rounded-[3px] bg-zinc-800/60 border border-zinc-700/20 skeleton-pulse"
              />
            ))}
          </div>
        </section>
      ))}

      <style>{`
        .skeleton-pulse { animation: skeletonPulse 1.8s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
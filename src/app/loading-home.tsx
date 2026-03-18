// src/app/(home)/loading.tsx  OR  src/app/loading.tsx
// depending on your route structure

export default function HomeLoading() {
  return (
    <div className="min-h-screen">
      {/* Welcome text */}
      <div className="mx-auto max-w-[960px] px-4 pt-10 pb-6">
        <div className="h-6 w-80 rounded bg-zinc-800/50 skeleton-pulse" />
      </div>

      <div className="mx-auto max-w-[960px] px-4">
        {/* New from community — poster strip */}
        <section className="pb-8">
          <div className="h-4 w-48 rounded bg-zinc-800/40 skeleton-pulse mb-3" />
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-[125px] flex-shrink-0 aspect-[3/4] rounded-[3px] bg-zinc-800/50 border border-zinc-700/20 skeleton-pulse"
              />
            ))}
          </div>
        </section>

        {/* Popular this week — grid */}
        <section className="pb-8">
          <div className="h-4 w-36 rounded bg-zinc-800/40 skeleton-pulse mb-3" />
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-[3px] bg-zinc-800/50 border border-zinc-700/20 skeleton-pulse"
              />
            ))}
          </div>
        </section>

        {/* Feed + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-10 pb-8">
          {/* Feed */}
          <div className="flex-1 min-w-0">
            <div className="h-4 w-32 rounded bg-zinc-800/40 skeleton-pulse mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-zinc-800/30">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 skeleton-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 rounded bg-zinc-800/40 skeleton-pulse" />
                    <div className="flex gap-3">
                      <div className="h-[70px] w-[48px] rounded-[3px] bg-zinc-800/40 skeleton-pulse flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 rounded bg-zinc-800/40 skeleton-pulse" />
                        <div className="h-3 w-full rounded bg-zinc-800/20 skeleton-pulse" />
                        <div className="h-3 w-3/4 rounded bg-zinc-800/15 skeleton-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[230px] flex-shrink-0 space-y-6">
            <div className="flex items-center justify-between">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="h-5 w-8 rounded bg-zinc-800/50 skeleton-pulse mx-auto" />
                  <div className="h-2.5 w-14 rounded bg-zinc-800/20 skeleton-pulse" />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded bg-zinc-800/30 skeleton-pulse" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <div className="h-6 w-6 rounded-full bg-zinc-800 skeleton-pulse" />
                  <div className="h-3.5 w-24 rounded bg-zinc-800/30 skeleton-pulse" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .skeleton-pulse { animation: skeletonPulse 1.8s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
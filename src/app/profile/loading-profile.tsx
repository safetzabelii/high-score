// src/app/profile/[username]/loading.tsx

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8">
      {/* Profile header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="h-24 w-24 flex-shrink-0 rounded-full bg-zinc-800 skeleton-pulse" />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Display name */}
            <div className="h-7 w-48 rounded bg-zinc-800 skeleton-pulse" />
            {/* Username */}
            <div className="h-4 w-24 rounded bg-zinc-800/50 skeleton-pulse" />
            {/* Bio */}
            <div className="h-4 w-64 rounded bg-zinc-800/40 skeleton-pulse" />

            {/* Stats row */}
            <div className="flex items-center gap-6 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-5 w-8 rounded bg-zinc-800/60 skeleton-pulse mx-auto mb-1" />
                  <div className="h-3 w-14 rounded bg-zinc-800/30 skeleton-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-800 mb-6">
        {["Games", "Reviews", "Lists"].map((tab) => (
          <div key={tab} className="h-4 w-16 rounded bg-zinc-800/40 skeleton-pulse mb-3" />
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-[3px] bg-zinc-800/50 border border-zinc-700/20 skeleton-pulse"
          />
        ))}
      </div>

      <style>{`
        .skeleton-pulse { animation: skeletonPulse 1.8s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
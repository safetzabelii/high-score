// src/app/settings/loading.tsx

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-[600px] px-4 py-8">
      {/* Title */}
      <div className="h-7 w-24 rounded bg-zinc-800 skeleton-pulse mb-8" />

      {/* Avatar section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-20 w-20 rounded-full bg-zinc-800 skeleton-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-zinc-800/50 skeleton-pulse" />
          <div className="h-8 w-28 rounded bg-zinc-800/40 skeleton-pulse" />
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-24 rounded bg-zinc-800/40 skeleton-pulse" />
            <div className="h-10 w-full rounded-md bg-zinc-900 border border-zinc-700/40 skeleton-pulse" />
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="mt-8">
        <div className="h-10 w-32 rounded-sm bg-zinc-800/50 skeleton-pulse" />
      </div>

      <style>{`
        .skeleton-pulse { animation: skeletonPulse 1.8s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Gamepad2, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface CompareViewProps {
  myUsername: string
  following: {
    username: string
    display_name: string
    avatar_url: string | null
  }[]
  selectedUsername: string | null
  comparison: {
    otherUser: {
      username: string
      display_name: string
      avatar_url: string | null
    }
    commonGames: {
      game_id: number
      title: string
      slug: string
      cover_url: string | null
      myRating: number | null
      theirRating: number | null
      myStatus: string
      theirStatus: string
    }[]
    myTotal: number
    theirTotal: number
  } | null
}

export function CompareView({
  myUsername,
  following,
  selectedUsername,
  comparison,
}: CompareViewProps) {
  const router = useRouter()

  const handleSelect = (username: string) => {
    router.push(`/compare?with=${username}`)
  }

  return (
    <div className="space-y-6">
      {/* User selector */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Compare with:
        </label>
        {following.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Follow some users first to compare your games with theirs.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {following.map((f) => (
              <button
                key={f.username}
                type="button"
                onClick={() => handleSelect(f.username)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors border",
                  selectedUsername === f.username
                    ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
                    : "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:text-zinc-200"
                )}
              >
                <div className="relative h-5 w-5 overflow-hidden rounded-full bg-zinc-700">
                  {f.avatar_url ? (
                    <Image
                      src={f.avatar_url}
                      alt={f.display_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserIcon className="h-2.5 w-2.5 text-zinc-500" />
                    </div>
                  )}
                </div>
                {f.display_name || f.username}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison results */}
      {comparison && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-lg font-bold text-zinc-100">{comparison.myTotal}</p>
              <p className="text-xs text-zinc-500">Your games</p>
            </div>
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-3">
              <p className="text-lg font-bold text-indigo-400">{comparison.commonGames.length}</p>
              <p className="text-xs text-zinc-500">In common</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-lg font-bold text-zinc-100">{comparison.theirTotal}</p>
              <p className="text-xs text-zinc-500">{comparison.otherUser.display_name}&apos;s</p>
            </div>
          </div>

          {/* Common games table */}
          {comparison.commonGames.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-12 text-center">
              <Gamepad2 className="mx-auto h-8 w-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">No games in common yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
                <span>Game</span>
                <span className="text-center">You</span>
                <span className="text-center">{comparison.otherUser.display_name.split(" ")[0]}</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-zinc-800/50">
                {comparison.commonGames.map((game) => {
                  const diff =
                    game.myRating != null && game.theirRating != null
                      ? game.myRating - game.theirRating
                      : null

                  return (
                    <div
                      key={game.game_id}
                      className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2.5 items-center hover:bg-zinc-800/30 transition-colors"
                    >
                      <Link
                        href={`/game/${game.slug}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                          {game.cover_url ? (
                            <Image
                              src={game.cover_url}
                              alt={game.title}
                              fill
                              className="object-cover"
                              sizes="28px"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <span className="text-sm text-zinc-200 truncate hover:text-zinc-50 transition-colors">
                          {game.title}
                        </span>
                      </Link>

                      <div className="flex items-center justify-center gap-1">
                        {game.myRating != null && game.myRating > 0 ? (
                          <>
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-sm font-medium text-zinc-200 tabular-nums">
                              {game.myRating}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-1">
                        {game.theirRating != null && game.theirRating > 0 ? (
                          <>
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span
                              className={cn(
                                "text-sm font-medium tabular-nums",
                                diff != null && diff > 0
                                  ? "text-red-400"
                                  : diff != null && diff < 0
                                    ? "text-emerald-400"
                                    : "text-zinc-200"
                              )}
                            >
                              {game.theirRating}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

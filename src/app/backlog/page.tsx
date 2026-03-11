import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BacklogManager } from "@/components/backlog/BacklogManager"
import type { GameLogRow, GameRow } from "@/types/database"

export const metadata: Metadata = {
  title: "My Backlog — HIGH-SCORE",
}

export default async function BacklogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/backlog")

  const { data: rawLogs } = await (supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", user.id)
    .eq("status", "backlog")
    .order("created_at", { ascending: false }) as any)

  type LogWithGame = GameLogRow & { games: GameRow }
  const logs = (rawLogs ?? []) as LogWithGame[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">My Backlog</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {logs.length} {logs.length === 1 ? "game" : "games"} in your backlog
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <p className="text-sm text-zinc-500">
            Your backlog is empty. Add games to your backlog to prioritize them here!
          </p>
        </div>
      ) : (
        <BacklogManager
          initialLogs={logs.map((l) => ({
            id: l.id,
            game_id: l.game_id,
            rating: l.rating,
            created_at: l.created_at,
            game_title: l.games.title,
            game_slug: l.games.slug,
            cover_url: l.games.cover_url,
            release_year: l.games.release_year,
          }))}
        />
      )}
    </div>
  )
}

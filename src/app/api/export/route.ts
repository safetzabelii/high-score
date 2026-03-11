import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { GameLogRow, GameRow } from "@/types/database"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: rawLogs } = await (supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", user.id)
    .order("logged_date", { ascending: false }) as any)

  type LogWithGame = GameLogRow & { games: GameRow }
  const logs = (rawLogs ?? []) as LogWithGame[]

  // Build CSV
  const headers = [
    "Title",
    "Status",
    "Rating",
    "Platforms",
    "Playtime (hours)",
    "Review",
    "Contains Spoilers",
    "Date Logged",
    "Release Year",
  ]

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const rows = logs.map((log) =>
    [
      escapeCSV(log.games.title),
      log.status,
      log.rating?.toString() ?? "",
      escapeCSV(log.platforms.join("; ")),
      log.playtime_hours?.toString() ?? "",
      escapeCSV(log.review_text ?? ""),
      log.contains_spoilers ? "Yes" : "No",
      log.logged_date,
      log.games.release_year?.toString() ?? "",
    ].join(",")
  )

  const csv = [headers.join(","), ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="highscore-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

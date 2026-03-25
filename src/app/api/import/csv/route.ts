import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchGames, shapeGame } from "@/lib/igdb/fetch"
import type { GameStatus } from "@/types/database"

// ── CSV parser (handles quoted fields, newlines inside quotes, escaped quotes) ──

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          field += '"'
          i += 2
        } else {
          // End of quoted field
          inQuotes = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ",") {
        row.push(field)
        field = ""
        i++
      } else if (ch === "\n" || (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n")) {
        row.push(field)
        field = ""
        if (row.some((f) => f.trim() !== "")) rows.push(row)
        row = []
        i += ch === "\r" ? 2 : 1
      } else if (ch === "\r") {
        row.push(field)
        field = ""
        if (row.some((f) => f.trim() !== "")) rows.push(row)
        row = []
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  // Flush last field/row
  row.push(field)
  if (row.some((f) => f.trim() !== "")) rows.push(row)

  return rows
}

// ── Status mapping ──

const STATUS_MAP: Record<string, GameStatus> = {
  played: "played",
  playing: "playing",
  backlog: "backlog",
  wishlist: "wishlist",
  completed: "completed",
  abandoned: "abandoned",
  // Common variations
  finished: "completed",
  beaten: "completed",
  done: "completed",
  "want to play": "wishlist",
  "plan to play": "wishlist",
  "want to buy": "wishlist",
  dropped: "abandoned",
  "gave up": "abandoned",
  shelved: "abandoned",
  "in progress": "playing",
  "currently playing": "playing",
  "on hold": "backlog",
  owned: "backlog",
}

function normalizeStatus(raw: string | undefined): GameStatus {
  if (!raw || raw.trim() === "") return "played"
  const key = raw.trim().toLowerCase()
  return STATUS_MAP[key] ?? "played"
}

// ── Column name normalization ──

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Map of normalized header names to canonical field names
const HEADER_MAP: Record<string, string> = {
  title: "title",
  game: "title",
  gamename: "title",
  name: "title",
  status: "status",
  rating: "rating",
  score: "rating",
  platforms: "platforms",
  platform: "platforms",
  playtimehours: "playtime",
  playtime: "playtime",
  hoursplayed: "playtime",
  review: "review",
  reviewtext: "review",
  containsspoilers: "spoilers",
  spoilers: "spoilers",
  datelogged: "date",
  date: "date",
  datecompleted: "date",
  releaseyear: "releaseyear",
}

// ── Batch helper ──

async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

// ── Route handler ──

const MAX_ROWS = 500
const BATCH_SIZE = 5

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing "file" field or not a file' },
      { status: 400 }
    )
  }

  if (!file.name.endsWith(".csv")) {
    return NextResponse.json(
      { error: "File must be a .csv" },
      { status: 400 }
    )
  }

  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV must have a header row and at least one data row" },
      { status: 400 }
    )
  }

  // Parse headers
  const headerRow = rows[0]
  const colMap: Record<string, number> = {}
  for (let i = 0; i < headerRow.length; i++) {
    const normalized = normalizeHeader(headerRow[i])
    const canonical = HEADER_MAP[normalized]
    if (canonical && !(canonical in colMap)) {
      colMap[canonical] = i
    }
  }

  if (!("title" in colMap)) {
    return NextResponse.json(
      {
        error:
          'CSV must have a "Title" or "Game" column. Found headers: ' +
          headerRow.map((h) => h.trim()).join(", "),
      },
      { status: 400 }
    )
  }

  const dataRows = rows.slice(1)
  if (dataRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${dataRows.length}). Maximum is ${MAX_ROWS}.` },
      { status: 400 }
    )
  }

  // Get user's existing game logs to skip duplicates
  const { data: existingLogs } = (await supabase
    .from("game_logs")
    .select("game_id")
    .eq("user_id", user.id)) as any

  const existingGameIds = new Set<number>(
    (existingLogs ?? []).map((l: { game_id: number }) => l.game_id)
  )

  // Parse each row into a structured record
  const get = (row: string[], field: string): string | undefined => {
    const idx = colMap[field]
    if (idx === undefined || idx >= row.length) return undefined
    return row[idx].trim()
  }

  interface ParsedRow {
    title: string
    status: GameStatus
    rating: number | null
    platforms: string[]
    playtime: number | null
    review: string | null
    spoilers: boolean
    date: string | null
  }

  const parsedRows: ParsedRow[] = dataRows
    .map((row) => {
      const title = get(row, "title")
      if (!title) return null

      const rawRating = get(row, "rating")
      let rating: number | null = null
      if (rawRating) {
        const n = parseFloat(rawRating)
        if (!isNaN(n) && n >= 0.5 && n <= 5.0) {
          rating = Math.round(n * 2) / 2 // Snap to half-star
        }
      }

      const rawPlatforms = get(row, "platforms")
      const platforms = rawPlatforms
        ? rawPlatforms.split(/[;|,]/).map((p) => p.trim()).filter(Boolean)
        : []

      const rawPlaytime = get(row, "playtime")
      let playtime: number | null = null
      if (rawPlaytime) {
        const n = parseFloat(rawPlaytime)
        if (!isNaN(n) && n >= 0) playtime = n
      }

      const rawReview = get(row, "review")
      const rawSpoilers = get(row, "spoilers")
      const rawDate = get(row, "date")

      return {
        title,
        status: normalizeStatus(get(row, "status")),
        rating,
        platforms,
        playtime,
        review: rawReview || null,
        spoilers:
          rawSpoilers?.toLowerCase() === "yes" ||
          rawSpoilers?.toLowerCase() === "true" ||
          false,
        date: rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
          ? rawDate.slice(0, 10)
          : null,
      } satisfies ParsedRow
    })
    .filter((r): r is ParsedRow => r !== null)

  // Process in batches
  let imported = 0
  let skipped = 0
  const failed: string[] = []

  type ProcessResult = { status: "imported" | "skipped" | "failed"; title: string }

  const results = await processBatch<ParsedRow, ProcessResult>(
    parsedRows,
    BATCH_SIZE,
    async (row) => {
      try {
        // Search IGDB for the game
        const igdbResults = await searchGames(row.title, 1)
        if (!igdbResults || igdbResults.length === 0) {
          return { status: "failed", title: row.title }
        }

        const shaped = shapeGame(igdbResults[0])

        // Skip if user already has this game logged
        if (existingGameIds.has(shaped.id)) {
          return { status: "skipped", title: row.title }
        }

        // Upsert into games table
        await (supabase.from("games").upsert(
          {
            id: shaped.id,
            title: shaped.title,
            slug: shaped.slug,
            cover_url: shaped.cover_url,
            release_year: shaped.release_year,
          },
          { onConflict: "id" }
        ) as any)

        // Insert game log
        await (supabase.from("game_logs").insert({
          user_id: user.id,
          game_id: shaped.id,
          rating: row.rating,
          status: row.status,
          review_text: row.review,
          contains_spoilers: row.spoilers,
          platforms: row.platforms,
          playtime_hours: row.playtime,
          logged_date: row.date ?? new Date().toISOString().slice(0, 10),
          playthrough_number: 1,
        }) as any)

        // Track so later rows with same game get skipped
        existingGameIds.add(shaped.id)

        return { status: "imported", title: row.title }
      } catch {
        return { status: "failed", title: row.title }
      }
    }
  )

  for (const r of results) {
    if (r.status === "imported") imported++
    else if (r.status === "skipped") skipped++
    else failed.push(r.title)
  }

  return NextResponse.json({
    imported,
    skipped,
    failed,
    total: parsedRows.length,
  })
}

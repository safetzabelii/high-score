import { NextResponse } from "next/server"
import { getAuthBackdropGames } from "@/lib/igdb/auth-backdrop"

export const revalidate = 3600 // ISR: cache this route for 1 hour

export async function GET() {
  const games = await getAuthBackdropGames()
  return NextResponse.json(games, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  })
}

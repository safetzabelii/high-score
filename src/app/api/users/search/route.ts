import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // Search by username or display_name (case-insensitive partial match)
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name, avatar_url, bio")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ results: data ?? [] })
  } catch (err) {
    console.error("[/api/users/search]", err)
    return NextResponse.json(
      { error: "User search failed." },
      { status: 500 }
    )
  }
}

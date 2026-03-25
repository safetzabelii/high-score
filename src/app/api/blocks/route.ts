import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await request.json()
  if (!userId || userId === user.id) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  try {
    // Insert the block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: blockError } = await (supabase.from("blocks") as any).insert({
      blocker_id: user.id,
      blocked_id: userId,
    })
    if (blockError) throw blockError

    // Unfollow both directions
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", userId)

    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[/api/blocks POST]", err)
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[/api/blocks DELETE]", err)
    return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from("blocks")
      .select("id, blocked_id, users!blocks_blocked_id_fkey(username, display_name, avatar_url)")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false }) as any)

    if (error) throw error

    const blocks = (data ?? []).map((row: any) => ({
      id: row.id,
      blocked_id: row.blocked_id,
      username: row.users?.username,
      display_name: row.users?.display_name,
      avatar_url: row.users?.avatar_url,
    }))

    return NextResponse.json({ blocks })
  } catch (err) {
    console.error("[/api/blocks GET]", err)
    return NextResponse.json({ error: "Failed to fetch blocked users" }, { status: 500 })
  }
}

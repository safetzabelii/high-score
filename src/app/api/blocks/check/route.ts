import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  try {
    // Check if current user blocked the target
    const { data: blockedRow } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .single()

    // Check if target blocked the current user
    const { data: blockedByRow } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", userId)
      .eq("blocked_id", user.id)
      .single()

    return NextResponse.json({
      blocked: !!blockedRow,
      blockedBy: !!blockedByRow,
    })
  } catch (err) {
    console.error("[/api/blocks/check]", err)
    return NextResponse.json({ error: "Failed to check block status" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listId, itemIds } = (await req.json()) as {
    listId: string
    itemIds: string[]
  }

  if (!listId || !Array.isArray(itemIds)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Verify ownership
  const { data: list } = await (supabase
    .from("lists")
    .select("user_id")
    .eq("id", listId)
    .single() as any)

  if (!list || list.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Update positions in order
  const updates = itemIds.map((id, index) =>
    (supabase
      .from("list_items")
      .update({ position: index })
      .eq("id", id)
      .eq("list_id", listId) as any)
  )

  await Promise.all(updates)

  return NextResponse.json({ ok: true })
}

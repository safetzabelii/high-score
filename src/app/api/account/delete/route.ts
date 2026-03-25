import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const service = createServiceClient()

  try {
    // 1. Delete likes by user
    await (service.from("likes").delete().eq("user_id", user.id) as any)

    // 2. Delete comments by user
    await (service.from("comments").delete().eq("user_id", user.id) as any)

    // 3. Delete notifications where user is recipient or actor
    await (service
      .from("notifications")
      .delete()
      .or(`user_id.eq.${user.id},actor_id.eq.${user.id}`) as any)

    // 4. Delete list_items for lists owned by user
    const { data: lists } = await (service
      .from("lists")
      .select("id")
      .eq("user_id", user.id) as any)

    if (lists && lists.length > 0) {
      const listIds = lists.map((l: { id: string }) => l.id)
      await (service
        .from("list_items")
        .delete()
        .in("list_id", listIds) as any)
    }

    // 5. Delete lists by user
    await (service.from("lists").delete().eq("user_id", user.id) as any)

    // 6. Delete favorite_games by user
    await (service
      .from("favorite_games")
      .delete()
      .eq("user_id", user.id) as any)

    // 7. Delete game_logs by user
    await (service.from("game_logs").delete().eq("user_id", user.id) as any)

    // 8. Delete follows where user is follower or following
    await (service
      .from("follows")
      .delete()
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`) as any)

    // 9. Delete from users table
    await (service.from("users").delete().eq("id", user.id) as any)

    // 10. Delete the auth user via admin API
    const { error: authError } = await service.auth.admin.deleteUser(user.id)
    if (authError) {
      console.error("Failed to delete auth user:", authError.message)
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Account deletion error:", err)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}

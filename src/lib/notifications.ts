import { supabase } from "@/lib/supabase/client"

/**
 * Create a notification. Fails silently — notifications
 * should never block the main action.
 */
export async function createNotification(params: {
  userId: string    // recipient
  actorId: string   // who triggered it
  type: "like" | "follow" | "comment"
  logId?: string    // for likes & comments
}) {
  // Don't notify yourself
  if (params.userId === params.actorId) return

  try {
    await (supabase.from("notifications") as any).insert({
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      log_id: params.logId ?? null,
    })
  } catch {
    // Silently fail — notification is non-critical
  }
}

/**
 * Remove a notification (e.g., when unliking or unfollowing).
 */
export async function removeNotification(params: {
  userId: string
  actorId: string
  type: "like" | "follow" | "comment"
  logId?: string
}) {
  try {
    let query = supabase
      .from("notifications")
      .delete()
      .eq("user_id", params.userId)
      .eq("actor_id", params.actorId)
      .eq("type", params.type)

    if (params.logId) {
      query = query.eq("log_id", params.logId)
    }

    await query
  } catch {
    // Silently fail
  }
}

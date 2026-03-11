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

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    )
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB." },
      { status: 400 }
    )
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const filePath = `${user.id}/avatar.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath)

  // Append cache-bust param to force browser refresh
  const avatarUrl = `${publicUrl}?v=${Date.now()}`

  // Update user profile
  const { error: updateError } = await (supabase.from("users") as any)
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: avatarUrl })
}

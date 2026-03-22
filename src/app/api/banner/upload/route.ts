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

  const validTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    )
  }

  // Max 4MB for banners (larger than avatars)
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 4MB." },
      { status: 400 }
    )
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const filePath = `${user.id}/banner.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath)

  const bannerUrl = `${publicUrl}?v=${Date.now()}`

  // Don't update user profile here — let the settings form handle saving
  return NextResponse.json({ banner_url: bannerUrl })
}

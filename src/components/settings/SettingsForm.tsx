"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { User as UserIcon, Loader2, Check, Upload, EyeOff, Eye, Download } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useSpoilerStore } from "@/stores/spoilerStore"

interface SettingsFormProps {
  profile: {
    username: string
    display_name: string
    avatar_url: string | null
    bio: string | null
  }
}

function SpoilerToggle() {
  const { hideSpoilers, toggleSpoilers } = useSpoilerStore()
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-3">
        {hideSpoilers ? (
          <EyeOff className="h-4 w-4 text-amber-500" />
        ) : (
          <Eye className="h-4 w-4 text-zinc-400" />
        )}
        <div>
          <p className="text-sm font-medium text-zinc-200">Hide spoilers</p>
          <p className="text-xs text-zinc-500">Blur reviews marked as containing spoilers</p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleSpoilers}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer",
          hideSpoilers ? "bg-hs-green-button" : "bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            hideSpoilers ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? "Upload failed")

      setAvatarUrl(data.avatar_url)
      toast.success("Avatar uploaded!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload avatar")
    } finally {
      setUploading(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!displayName.trim()) {
      toast.error("Display name is required")
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { error } = await (supabase.from("users") as any)
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success("Profile updated!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar preview + upload */}
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-800">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon className="h-7 w-7 text-zinc-600" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <p className="font-medium text-sm text-zinc-200">{profile.username}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-hs-green hover:text-hs-blue transition-colors disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            Upload photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Display name */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green focus:border-transparent transition-colors"
        />
      </div>

      {/* Avatar URL (still available as alternative) */}
      <div>
        <label htmlFor="avatarUrl" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/your-avatar.jpg"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green focus:border-transparent transition-colors"
        />
        <p className="mt-1 text-xs text-zinc-600">
          Or paste a direct link to an image
        </p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
          placeholder="Tell others about yourself..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green focus:border-transparent transition-colors resize-none"
        />
        <p className="mt-1 text-xs text-zinc-600 text-right">
          {bio.length}/300
        </p>
      </div>

      {/* Spoiler filter */}
      <SpoilerToggle />

      {/* Export data */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <Download className="h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-sm font-medium text-zinc-200">Export game log</p>
            <p className="text-xs text-zinc-500">Download your data as a CSV file</p>
          </div>
        </div>
        <a
          href="/api/export"
          download
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </a>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
          "bg-hs-green-button hover:bg-hs-green-hover text-white shadow-lg",
          saving && "opacity-70 cursor-not-allowed"
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Save Changes
          </>
        )}
      </button>
    </form>
  )
}

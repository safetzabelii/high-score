"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  User as UserIcon, Loader2, Check, Upload, EyeOff, Eye, Download,
  FileUp, AlertTriangle, Trash2
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useSpoilerStore } from "@/stores/spoilerStore"

interface SettingsFormProps {
  profile: {
    username: string
    display_name: string
    avatar_url: string | null
    banner_url: string | null
    banner_y: number
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
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const bannerContainerRef = useRef<HTMLDivElement>(null)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url ?? "")
  const [bannerY, setBannerY] = useState(profile.banner_y ?? 50)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerDirty, setBannerDirty] = useState(false)
  const [isDraggingBanner, setIsDraggingBanner] = useState(false)
  const dragStartRef = useRef<{ y: number; startBannerY: number } | null>(null)

  // Import state
  const [steamId, setSteamId] = useState("")
  const [importingSteam, setImportingSteam] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [importingCsv, setImportingCsv] = useState(false)

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

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

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/banner/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")

      setBannerUrl(data.banner_url)
      setBannerY(50) // Reset position for new image
      setBannerDirty(true)
      toast.info("Banner uploaded — drag to reposition, then save.")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload banner")
    } finally {
      setUploadingBanner(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ""
    }
  }

  // Banner drag handlers
  function handleBannerDragStart(e: React.MouseEvent | React.TouchEvent) {
    if (!bannerUrl) return
    e.preventDefault()
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    dragStartRef.current = { y: clientY, startBannerY: bannerY }
    setIsDraggingBanner(true)

    function handleMove(ev: MouseEvent | TouchEvent) {
      if (!dragStartRef.current || !bannerContainerRef.current) return
      const currentY = "touches" in ev ? ev.touches[0].clientY : ev.clientY
      const containerHeight = bannerContainerRef.current.clientHeight
      const delta = currentY - dragStartRef.current.y
      // Invert: drag down = image moves up (lower %)
      const pctDelta = (delta / containerHeight) * -100
      const newY = Math.max(0, Math.min(100, dragStartRef.current.startBannerY + pctDelta))
      setBannerY(newY)
      setBannerDirty(true)
    }

    function handleEnd() {
      setIsDraggingBanner(false)
      dragStartRef.current = null
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleMove)
    window.addEventListener("touchend", handleEnd)
  }

  async function handleSteamImport() {
    if (!steamId.trim()) {
      toast.error("Enter your Steam ID or profile URL")
      return
    }
    setImportingSteam(true)
    try {
      const res = await fetch("/api/import/steam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId: steamId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Steam import failed")
      let msg = `Imported ${data.imported} games! (${data.skipped} skipped)`
      if (data.failed?.length > 0) {
        msg += ` — ${data.failed.length} couldn't be matched`
      }
      toast.success(msg)
      setSteamId("")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to import from Steam")
    } finally {
      setImportingSteam(false)
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingCsv(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "CSV import failed")
      let msg = `Imported ${data.imported} games!`
      if (data.skipped > 0) msg += ` (${data.skipped} skipped)`
      if (data.failed?.length > 0) msg += ` — ${data.failed.length} couldn't be matched.`
      toast.success(msg)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to import CSV")
    } finally {
      setImportingCsv(false)
      if (csvInputRef.current) csvInputRef.current.value = ""
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== profile.username) return
    setDeleting(true)
    try {
      const res = await fetch("/api/account/delete", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to delete account")
      toast.success("Account deleted. Goodbye!")
      await supabase.auth.signOut()
      router.push("/")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete account")
    } finally {
      setDeleting(false)
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
          banner_url: bannerUrl.trim() || null,
          banner_y: Math.round(bannerY),
          bio: bio.trim() || null,
        })
        .eq("id", user.id)

      if (error) throw error

      setBannerDirty(false)
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

      {/* Banner preview + upload + reposition */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Profile Banner
          </label>
          {bannerDirty && (
            <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
              Unsaved — click Save Changes below
            </span>
          )}
        </div>
        <div
          ref={bannerContainerRef}
          className={cn(
            "relative h-28 sm:h-36 overflow-hidden rounded-lg border bg-zinc-800 select-none",
            bannerUrl && !uploadingBanner ? "cursor-grab active:cursor-grabbing" : "",
            isDraggingBanner ? "border-hs-green" : "border-zinc-700"
          )}
          onMouseDown={bannerUrl ? handleBannerDragStart : undefined}
          onTouchStart={bannerUrl ? handleBannerDragStart : undefined}
        >
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt="Banner"
              fill
              className="object-cover pointer-events-none"
              style={{ objectPosition: `center ${bannerY}%` }}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800" />
          )}
          {uploadingBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          {/* Upload button + drag hint */}
          {!isDraggingBanner && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click() }}
                  disabled={uploadingBanner}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-600"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Upload className="h-3 w-3" />
                  {bannerUrl ? "Change Banner" : "Upload Banner"}
                </button>
                {bannerUrl && (
                  <p className="text-[10px] text-zinc-400">Drag to reposition</p>
                )}
              </div>
            </div>
          )}
          {/* Drag indicator when dragging */}
          {isDraggingBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <p className="text-xs text-white font-medium bg-black/60 px-3 py-1 rounded-full">
                Drag to reposition
              </p>
            </div>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleBannerUpload}
          className="hidden"
        />
        <p className="mt-1 text-xs text-zinc-600">
          Recommended: 1500x500px, max 4MB. {bannerUrl && "Drag image to adjust position."}
        </p>
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

      {/* ── Import Section ────────────────────────────────── */}
      <div className="!mt-12 border-t border-zinc-800 pt-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Import</h2>
        <p className="text-xs text-zinc-500 mb-6">Import your game library from other platforms.</p>

        {/* Steam Import */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <svg className="h-5 w-5 text-zinc-300 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.979 0C5.678 0 .511 4.86.022 10.935l6.432 2.658a3.387 3.387 0 0 1 1.912-.59c.064 0 .128.002.191.006l2.861-4.142V8.77c0-2.58 2.1-4.68 4.68-4.68 2.58 0 4.68 2.1 4.68 4.68s-2.1 4.682-4.68 4.682h-.109l-4.078 2.91c0 .048.003.097.003.146 0 1.94-1.577 3.516-3.516 3.516-1.694 0-3.112-1.2-3.44-2.795L.453 15.305A11.98 11.98 0 0 0 11.979 24c6.627 0 12-5.373 12-12S18.606 0 11.979 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-zinc-200">Steam Library</p>
              <p className="text-xs text-zinc-500">Import your owned games from Steam</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="Steam ID or vanity URL (e.g. 76561198...)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-hs-green/30 focus:border-hs-green/50 transition-colors"
            />
            <button
              type="button"
              onClick={handleSteamImport}
              disabled={importingSteam || !steamId.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importingSteam ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {importingSteam ? "Importing..." : "Import"}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-zinc-600">
            Your Steam profile must be set to public. Games are matched via IGDB.
          </p>
        </div>

        {/* CSV Import */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <FileUp className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Import from CSV</p>
              <p className="text-xs text-zinc-500">Upload a CSV file with your game data</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={importingCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-50"
          >
            {importingCsv ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
            {importingCsv ? "Importing..." : "Upload CSV"}
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvImport}
            className="hidden"
          />
        </div>
      </div>

      {/* ── Danger Zone ───────────────────────────────────── */}
      <div className="!mt-12 border-t border-red-900/30 pt-8">
        <h2 className="text-lg font-semibold text-red-400 mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h2>
        <p className="text-xs text-zinc-500 mb-4">Irreversible actions. Proceed with caution.</p>

        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Delete Account</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Permanently delete your account and all associated data including game logs, reviews, lists, follows, and favorites. This action cannot be undone.
              </p>
            </div>
            {!showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-950/50 border border-red-900/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 border-t border-red-900/30 pt-4">
              <p className="text-xs text-zinc-400 mb-2">
                Type <span className="font-mono font-semibold text-red-400">{profile.username}</span> to confirm deletion:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={profile.username}
                  className="flex-1 rounded-lg border border-red-900/50 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== profile.username || deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText("") }}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, Globe, Lock } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function CreateListForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data, error } = await (supabase.from("lists") as any)
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        })
        .select("id")
        .single()

      if (error) throw error

      toast.success("List created!")
      router.push(`/lists/${data.id}`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create list")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Top 10 RPGs"
          maxLength={100}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green/30 focus:border-transparent transition-colors"
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Description <span className="text-zinc-600">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What's this list about?"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green/30 focus:border-transparent transition-colors resize-none"
        />
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Visibility</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={cn(
              "flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-medium transition-colors",
              isPublic
                ? "border-hs-green bg-hs-green/10 text-hs-green"
                : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
            )}
          >
            <Globe className="h-4 w-4" />
            Public
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={cn(
              "flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-medium transition-colors",
              !isPublic
                ? "border-hs-green bg-hs-green/10 text-hs-green"
                : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
            )}
          >
            <Lock className="h-4 w-4" />
            Private
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className={cn(
          "inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-medium transition-all",
          "bg-hs-green-button hover:bg-hs-green-hover text-white shadow-lg shadow-black/30",
          saving && "opacity-70 cursor-not-allowed"
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Create List
          </>
        )}
      </button>
    </form>
  )
}

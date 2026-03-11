"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"

interface RemoveListItemProps {
  itemId: string
}

export function RemoveListItem({ itemId }: RemoveListItemProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (removing) return
    setRemoving(true)

    try {
      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("id", itemId)

      if (error) throw error

      toast.success("Removed from list")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove game")
      setRemoving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={removing}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      aria-label="Remove from list"
    >
      {removing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

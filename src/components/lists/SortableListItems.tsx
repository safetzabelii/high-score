"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { GripVertical } from "lucide-react"
import { RemoveListItem } from "@/components/lists/RemoveListItem"

interface ListItem {
  id: string
  game_id: number
  note: string | null
  position: number
  games: {
    title: string
    slug: string
    cover_url: string | null
    release_year: number | null
  }
}

interface SortableListItemsProps {
  items: ListItem[]
  listId: string
  isOwner: boolean
}

export function SortableListItems({ items: initialItems, listId, isOwner }: SortableListItemsProps) {
  const [items, setItems] = useState(initialItems)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const dragNode = useRef<HTMLDivElement | null>(null)

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index)
    dragNode.current = e.currentTarget
    e.dataTransfer.effectAllowed = "move"
    // Make the drag image slightly transparent
    requestAnimationFrame(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4"
    })
  }

  const handleDragEnd = async () => {
    if (dragNode.current) dragNode.current.style.opacity = "1"

    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newItems = [...items]
      const [moved] = newItems.splice(dragIndex, 1)
      newItems.splice(overIndex, 0, moved)
      setItems(newItems)

      // Persist new order
      setSaving(true)
      try {
        await fetch("/api/lists/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId,
            itemIds: newItems.map((i) => i.id),
          }),
        })
      } catch {
        // Revert on error
        setItems(items)
      } finally {
        setSaving(false)
      }
    }

    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (index !== overIndex) setOverIndex(index)
  }

  return (
    <div className="space-y-2">
      {saving && (
        <div className="text-xs text-zinc-500 mb-1">Saving order...</div>
      )}
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={isOwner}
          onDragStart={(e) => handleDragStart(index, e)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(index, e)}
          onDragEnter={(e) => e.preventDefault()}
          className={`flex items-center gap-4 rounded-lg border p-3 transition-colors ${
            overIndex === index && dragIndex !== null && dragIndex !== index
              ? "border-indigo-500/50 bg-indigo-950/20"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          {/* Drag handle */}
          {isOwner && (
            <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-zinc-600 active:cursor-grabbing" />
          )}

          {/* Position number */}
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
            {index + 1}
          </span>

          {/* Game cover */}
          <Link
            href={`/game/${item.games.slug}`}
            className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-zinc-800"
          >
            {item.games.cover_url ? (
              <Image
                src={item.games.cover_url}
                alt={item.games.title}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[8px] text-zinc-600">
                {item.games.title}
              </div>
            )}
          </Link>

          {/* Game info */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/game/${item.games.slug}`}
              className="text-sm font-medium text-zinc-200 hover:text-zinc-50 transition-colors"
            >
              {item.games.title}
            </Link>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              {item.games.release_year && <span>{item.games.release_year}</span>}
              {item.note && (
                <>
                  <span>·</span>
                  <span className="text-zinc-500 truncate">{item.note}</span>
                </>
              )}
            </div>
          </div>

          {/* Remove button (owner only) */}
          {isOwner && <RemoveListItem itemId={item.id} />}
        </div>
      ))}
    </div>
  )
}

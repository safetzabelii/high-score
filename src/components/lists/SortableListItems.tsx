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
    <div>
      {saving && (
        <div className="text-xs text-zinc-500 mb-2">Saving order...</div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable={isOwner}
            onDragStart={(e) => handleDragStart(index, e)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(index, e)}
            onDragEnter={(e) => e.preventDefault()}
            className={`group relative rounded-lg overflow-hidden border transition-all ${
              isOwner ? "cursor-grab active:cursor-grabbing" : ""
            } ${
              overIndex === index && dragIndex !== null && dragIndex !== index
                ? "border-[#ff0055]/50 ring-1 ring-[#ff0055]/30 scale-[1.02]"
                : "border-zinc-800/60 hover:border-zinc-700"
            }`}
          >
            {/* Cover image */}
            <Link href={`/game/${item.games.slug}`} className="block">
              <div className="relative aspect-[3/4] bg-zinc-900">
                {item.games.cover_url ? (
                  <Image
                    src={item.games.cover_url}
                    alt={item.games.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600 p-2 text-center">
                    {item.games.title}
                  </div>
                )}

                {/* Dark gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

                {/* Title overlay */}
                <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5">
                  <p className="text-xs font-semibold text-zinc-100 truncate transition-colors">
                    {item.games.title}
                  </p>
                  {item.games.release_year && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">{item.games.release_year}</p>
                  )}
                </div>

                {/* Rank badge */}
                <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-sm w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-zinc-200 border border-zinc-700/50">
                  {index + 1}
                </div>
              </div>
            </Link>

            {/* Owner controls overlay */}
            {isOwner && (
              <>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <RemoveListItem itemId={item.id} />
                </div>
                <div className="absolute top-9 left-2 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none z-10">
                  <GripVertical className="h-4 w-4 text-zinc-300 drop-shadow" />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

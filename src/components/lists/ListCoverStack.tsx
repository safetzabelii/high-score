"use client"

import Image from "next/image"
import { Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ListCoverStackProps {
  covers: (string | null)[]
  totalItems: number
  className?: string
  maxCovers?: number
}

export function ListCoverStack({ 
  covers, 
  totalItems, 
  className,
  maxCovers = 5 
}: ListCoverStackProps) {
  const displayCovers = covers.slice(0, maxCovers)
  
  if (totalItems === 0) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-zinc-800/50 rounded-[3px] border border-zinc-700/30", className)}>
        <Gamepad2 className="h-6 w-6 text-zinc-600" />
      </div>
    )
  }

  return (
    <div className={cn("relative flex h-full w-full items-end", className)}>
      {displayCovers.map((cover, idx) => {
        // Calculate z-index so first item is on top
        const zIndex = maxCovers - idx
        
        // Slightly rotate and scale down items further back in the stack, similar to Letterboxd
        const isBackground = idx > 0
        const scale = isBackground ? 1 - (idx * 0.05) : 1
        const translateX = isBackground ? idx * 12 : 0
        const translateY = isBackground ? -(idx * 2) : 0
        
        return (
          <div
            key={idx}
            className={cn(
              "absolute bottom-0 left-0 aspect-[3/4] rounded-[2px] border border-zinc-700/50 bg-zinc-800 overflow-hidden shadow-md transition-transform duration-300",
              idx === 0 ? "w-full ring-1 ring-black/50" : "w-[90%]" // Base size
            )}
            style={{
              zIndex,
              transform: `translateX(${translateX}%) translateY(${translateY}%) scale(${scale})`,
              transformOrigin: "bottom left",
              opacity: isBackground ? Math.max(0.3, 1 - (idx * 0.2)) : 1
            }}
          >
            {cover ? (
              <Image
                src={cover}
                alt={`Cover ${idx + 1}`}
                fill
                className="object-cover"
                sizes="100px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900">
                <Gamepad2 className="h-4 w-4 text-zinc-600" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

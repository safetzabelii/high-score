"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number | null
  onChange: (rating: number | null) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: "h-[14px] w-[14px]",
  md: "h-5 w-5",
  lg: "h-7 w-7",
}

// Compact smooth heart — matches the classic gaming heart shape
const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"

/**
 * Rating → color: yellow (low) → orange (mid) → red/pink (high)
 * All hearts share the same color based on overall rating.
 */
function ratingColor(rating: number): string {
  const t = Math.max(0, Math.min(1, (rating - 0.5) / 4.5))
  const r = 255
  const g = Math.round(215 - t * 215)
  const b = Math.round(t * 85)
  return `rgb(${r},${g},${b})`
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const display = hovered ?? value ?? 0

  function handleClick(star: number, half: boolean) {
    if (readonly) return
    const rating = half ? star - 0.5 : star
    if (rating === value) {
      onChange(null)
    } else {
      onChange(rating)
    }
  }

  function handleMouseMove(e: React.MouseEvent, star: number) {
    if (readonly) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const half = e.clientX - rect.left < rect.width / 2
    setHovered(half ? star - 0.5 : star)
  }

  return (
    <div
      className="flex items-center gap-[2px]"
      onMouseLeave={() => setHovered(null)}
      role={readonly ? "img" : "slider"}
      aria-label={`Rating: ${value ?? 0} out of 5`}
      aria-valuenow={value ?? 0}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star
        const half   = display >= star - 0.5 && display < star

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={cn(
              "relative transition-transform",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default",
              sizes[size]
            )}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const isHalf = e.clientX - rect.left < rect.width / 2
              handleClick(star, isHalf)
            }}
          >
            {half ? (
              <HeartHalf className={cn("absolute inset-0", sizes[size])} color={ratingColor(display)} />
            ) : filled ? (
              <HeartFull className={cn("absolute inset-0", sizes[size])} color={ratingColor(display)} />
            ) : (
              <HeartEmpty className={cn("absolute inset-0", sizes[size])} />
            )}
          </button>
        )
      })}

      {value !== null && value !== undefined && !readonly && (
        <span className="ml-2 text-sm font-medium text-zinc-400 tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}

/** Inline read-only heart display for reviews, feeds, etc. */
export function HeartRatingDisplay({
  rating,
  size = "sm",
}: {
  rating: number
  size?: "sm" | "md"
}) {
  const sizeClass = size === "sm" ? "h-[13px] w-[13px]" : "h-4 w-4"
  const hasHalf = rating % 1 >= 0.5
  const fullHearts = Math.floor(rating)
  const color = ratingColor(rating)

  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: fullHearts }).map((_, i) => (
        <HeartFull key={i} className={sizeClass} color={color} />
      ))}
      {hasHalf && (
        <span
          className={cn(
            "font-bold leading-none",
            size === "sm" ? "text-[13px]" : "text-[15px]"
          )}
          style={{ color }}
        >
          ½
        </span>
      )}
    </div>
  )
}

function HeartFull({ className, color }: { className?: string; color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path d={HEART} fill={color} />
    </svg>
  )
}

function HeartEmpty({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path d={HEART} fill="none" stroke="#52525b" strokeWidth="1.5" />
    </svg>
  )
}

function HeartHalf({ className, color }: { className?: string; color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      {/* Left half filled */}
      <clipPath id="hhl">
        <rect x="0" y="0" width="12" height="24" />
      </clipPath>
      <path d={HEART} fill={color} clipPath="url(#hhl)" />
    </svg>
  )
}

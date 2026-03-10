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
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
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
    // Click same rating to clear
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
      className="flex items-center gap-0.5"
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
            {/* Background star (empty) */}
            <StarIcon
              className={cn("absolute inset-0", sizes[size], "text-zinc-700")}
              filled
            />
            {/* Filled overlay */}
            {(filled || half) && (
              <span
                className={cn(
                  "absolute inset-0 overflow-hidden",
                  half ? "w-1/2" : "w-full"
                )}
              >
                <StarIcon
                  className={cn(sizes[size], "text-indigo-400")}
                  filled
                />
              </span>
            )}
          </button>
        )
      })}

      {value !== null && value !== undefined && (
        <span className="ml-2 text-sm font-medium text-zinc-400 tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}

function StarIcon({
  className,
  filled,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  )
}
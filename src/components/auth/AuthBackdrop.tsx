// src/components/auth/AuthBackdrop.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface BackdropGame {
  name: string
  screenshot_url: string
  cover_url: string | null
  year: number | null
}

/**
 * Self-fetching backdrop — loads game images client-side
 * so the page shell renders instantly without blocking on any API.
 * Uses a plain <img> with low quality to keep the page lightweight.
 */
export function AuthBackdrop() {
  const [games, setGames] = useState<BackdropGame[]>([])
  const [active, setActive] = useState(0)
  const [displayIdx, setDisplayIdx] = useState(0)
  const [phase, setPhase] = useState<"visible" | "fading-out" | "fading-in">("visible")
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch backdrop games client-side (non-blocking)
  useEffect(() => {
    fetch("/api/games/backdrop")
      .then((r) => r.json())
      .then((data: BackdropGame[]) => {
        if (data.length > 0) setGames(data)
      })
      .catch(() => {})
  }, [])

  const advance = useCallback(() => {
    if (games.length < 2) return
    setPhase("fading-out")

    timerRef.current = setTimeout(() => {
      const next = (active + 1) % games.length
      setActive(next)
      setDisplayIdx(next)
      setLoaded(false)
      setPhase("fading-in")

      timerRef.current = setTimeout(() => {
        setPhase("visible")
      }, 800)
    }, 800)
  }, [active, games.length])

  useEffect(() => {
    if (games.length < 2) return
    const interval = setInterval(advance, 7000)
    return () => {
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [advance, games.length])

  if (games.length === 0) {
    return <div className="absolute inset-0 bg-zinc-950" />
  }

  const current = games[displayIdx]
  const opacity = phase === "fading-out" ? 0 : loaded ? 0.5 : 0

  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-950">
      {/* Single image — plain img tag, no Next/Image overhead, grayscale via CSS */}
      <img
        src={current.screenshot_url}
        alt=""
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover grayscale transition-opacity duration-[800ms] ease-in-out"
        style={{ opacity }}
        loading="lazy"
        decoding="async"
      />

      {/* ── Game info — bottom left ── */}
      <div className="absolute bottom-0 left-0 p-8 z-10 max-w-[50%]">
        <div key={current.name} className="animate-[authPop_0.4s_ease-out_both]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
            {current.year && current.year >= new Date().getFullYear() ? "Upcoming" : "Now Playing"}
          </p>
          <h2 className="font-serif text-[22px] leading-[1.2] text-white/40">
            {current.name}
          </h2>
        </div>

        {/* Minimal dots */}
        {games.length > 1 && (
          <div className="flex items-center gap-1.5 mt-4">
            {games.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i !== active && phase === "visible") {
                    setPhase("fading-out")
                    setTimeout(() => {
                      setActive(i)
                      setDisplayIdx(i)
                      setLoaded(false)
                      setPhase("fading-in")
                      setTimeout(() => setPhase("visible"), 800)
                    }, 800)
                  }
                }}
                className="transition-all duration-500"
                aria-label={`Show game ${i + 1}`}
              >
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: i === active ? "16px" : "4px",
                    height: "4px",
                    backgroundColor: i === active ? "#ff0055" : "rgba(255,255,255,0.15)",
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes authPop {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

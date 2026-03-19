// src/components/auth/AuthBackdrop.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"

interface BackdropGame {
  name: string
  screenshot_url: string
  cover_url: string | null
  year: number | null
}

export function AuthBackdrop({ games }: { games: BackdropGame[] }) {
  const [active, setActive] = useState(0)
  const [displayIdx, setDisplayIdx] = useState(0)
  const [phase, setPhase] = useState<"visible" | "fading-out" | "fading-in">("visible")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    if (games.length < 2) return
    // Phase 1: fade out current
    setPhase("fading-out")

    timerRef.current = setTimeout(() => {
      // Phase 2: swap image while invisible, then fade in
      const next = (active + 1) % games.length
      setActive(next)
      setDisplayIdx(next)
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
  const opacity = phase === "fading-out" ? 0 : phase === "fading-in" ? 0.5 : 0.5

  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-950">
      {/* Single image — clean sequential transition */}
      <div
        className="absolute inset-0 saturate-[0.2] transition-opacity duration-[800ms] ease-in-out"
        style={{ opacity }}
      >
        <Image
          src={current.screenshot_url}
          alt=""
          fill
          className="object-cover scale-[1.03] auth-drift"
          priority
        />
      </div>

      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Game info — bottom left ── */}
      <div className="absolute bottom-0 left-0 p-8 z-10 max-w-[50%]">
        <div key={current.name} className="auth-content-pop">
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
        .auth-drift {
          animation: authDrift 20s ease-in-out infinite alternate;
        }
        @keyframes authDrift {
          0% { transform: scale(1.03); }
          100% { transform: scale(1.07) translate(-0.5%, -0.3%); }
        }
        .auth-content-pop {
          animation: authPop 0.4s ease-out both;
        }
        @keyframes authPop {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

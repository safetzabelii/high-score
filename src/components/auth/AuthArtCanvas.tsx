// src/components/auth/AuthArtCanvas.tsx
"use client"

import { useRef, useEffect, useCallback } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

interface Hex {
  x: number
  y: number
  size: number
  rotation: number
  rotSpeed: number
  opacity: number
  drift: number
  phase: number
  color: string
}

interface GridLine {
  pos: number
  axis: "x" | "y"
  opacity: number
  speed: number
  glow: number
}

const PINK = "#ff0055"
const BG = "#0B0C10"

export function AuthArtCanvas({ variant = "login" }: { variant?: "login" | "signup" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const stateRef = useRef<{
    particles: Particle[]
    hexes: Hex[]
    gridLines: GridLine[]
    time: number
    mouse: { x: number; y: number }
  }>({
    particles: [],
    hexes: [],
    gridLines: [],
    time: 0,
    mouse: { x: -1, y: -1 },
  })

  const isPink = variant === "login"
  const primary = isPink ? PINK : PINK
  const secondary = isPink ? PINK : PINK

  const initState = useCallback(
    (w: number, h: number) => {
      const s = stateRef.current

      // Particles — floating motes
      s.particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.15,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.7 ? secondary : primary,
        life: 0,
        maxLife: Math.random() * 400 + 200,
      }))

      // Hexagons — slow-rotating geometric shapes
      s.hexes = Array.from({ length: 6 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 60 + 30,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.003,
        opacity: Math.random() * 0.08 + 0.02,
        drift: Math.random() * 0.2 + 0.05,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? primary : secondary,
      }))

      // Travelling grid lines
      s.gridLines = Array.from({ length: 8 }, (_, i) => ({
        pos: Math.random() * (i < 4 ? w : h),
        axis: (i < 4 ? "x" : "y") as "x" | "y",
        opacity: Math.random() * 0.06 + 0.02,
        speed: (Math.random() * 0.3 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
        glow: Math.random() * 8 + 2,
      }))

      s.time = 0
    },
    [primary, secondary]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initState(rect.width, rect.height)
    }

    resize()
    window.addEventListener("resize", resize)

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      stateRef.current.mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener("mousemove", handleMouse)

    const drawHex = (
      cx: number,
      cy: number,
      size: number,
      rotation: number,
      color: string,
      opacity: number
    ) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = rotation + (Math.PI / 3) * i
        const x = cx + size * Math.cos(angle)
        const y = cy + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.globalAlpha = opacity
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const drawDiamond = (
      cx: number,
      cy: number,
      size: number,
      rotation: number,
      color: string,
      opacity: number
    ) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotation)
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size * 0.6, 0)
      ctx.lineTo(0, size)
      ctx.lineTo(-size * 0.6, 0)
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.globalAlpha = opacity
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.restore()
    }

    const frame = () => {
      const s = stateRef.current
      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      s.time++

      ctx.clearRect(0, 0, w, h)

      // Background gradient — deep and moody
      const bg = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.9)
      bg.addColorStop(0, isPink ? "rgba(255,0,85,0.04)" : "rgba(255,0,85,0.03)")
      bg.addColorStop(0.5, "rgba(11,12,16,0.3)")
      bg.addColorStop(1, "rgba(11,12,16,0)")
      ctx.fillStyle = bg
      ctx.globalAlpha = 1
      ctx.fillRect(0, 0, w, h)

      // Secondary glow — bottom corner
      const bg2 = ctx.createRadialGradient(w * 0.8, h * 0.85, 0, w * 0.8, h * 0.85, w * 0.5)
      bg2.addColorStop(0, isPink ? "rgba(255,0,85,0.025)" : "rgba(255,0,85,0.02)")
      bg2.addColorStop(1, "rgba(11,12,16,0)")
      ctx.fillStyle = bg2
      ctx.fillRect(0, 0, w, h)

      // ── Grid lines ──
      for (const line of s.gridLines) {
        line.pos += line.speed
        const max = line.axis === "x" ? w : h
        if (line.pos > max) line.pos = 0
        if (line.pos < 0) line.pos = max

        ctx.globalAlpha = line.opacity
        ctx.strokeStyle = primary
        ctx.lineWidth = 0.5
        ctx.shadowColor = primary
        ctx.shadowBlur = line.glow

        ctx.beginPath()
        if (line.axis === "x") {
          ctx.moveTo(line.pos, 0)
          ctx.lineTo(line.pos, h)
        } else {
          ctx.moveTo(0, line.pos)
          ctx.lineTo(w, line.pos)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // ── Hexagons & diamonds ──
      for (let i = 0; i < s.hexes.length; i++) {
        const hex = s.hexes[i]
        hex.rotation += hex.rotSpeed
        hex.y += Math.sin(s.time * 0.01 + hex.phase) * hex.drift * 0.3
        hex.x += Math.cos(s.time * 0.008 + hex.phase) * hex.drift * 0.2

        // Wrap around
        if (hex.x < -hex.size) hex.x = w + hex.size
        if (hex.x > w + hex.size) hex.x = -hex.size
        if (hex.y < -hex.size) hex.y = h + hex.size
        if (hex.y > h + hex.size) hex.y = -hex.size

        // Subtle pulse
        const pulse = Math.sin(s.time * 0.015 + hex.phase) * 0.3 + 0.7
        const o = hex.opacity * pulse

        if (i % 2 === 0) {
          drawHex(hex.x, hex.y, hex.size, hex.rotation, hex.color, o)
        } else {
          drawDiamond(hex.x, hex.y, hex.size, hex.rotation, hex.color, o)
        }
      }

      // ── Particles ──
      for (const p of s.particles) {
        p.life++
        p.x += p.vx
        p.y += p.vy

        // Fade in/out
        const lifeRatio = p.life / p.maxLife
        const fade = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1

        // Mouse interaction — gentle push
        if (s.mouse.x > 0) {
          const dx = p.x - s.mouse.x
          const dy = p.y - s.mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120 * 0.15
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        // Damping
        p.vx *= 0.998
        p.vy *= 0.998

        // Wrap
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        // Reset dead particles
        if (p.life >= p.maxLife) {
          p.x = Math.random() * w
          p.y = Math.random() * h
          p.life = 0
          p.maxLife = Math.random() * 400 + 200
          p.opacity = Math.random() * 0.5 + 0.1
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity * fade
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.size * 3
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // ── Occasional glitch flicker ──
      if (Math.random() < 0.003) {
        const glitchY = Math.random() * h
        const glitchH = Math.random() * 3 + 1
        ctx.globalAlpha = Math.random() * 0.08 + 0.02
        ctx.fillStyle = Math.random() > 0.5 ? PINK : PINK
        ctx.fillRect(0, glitchY, w, glitchH)
      }

      // ── Scanline overlay ──
      ctx.globalAlpha = 0.015
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = "#000"
        ctx.fillRect(0, y, w, 1)
      }

      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("mousemove", handleMouse)
    }
  }, [initState, isPink, primary, secondary])

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: BG }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Atmospheric CSS overlays on top of canvas */}
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, ${BG} 100%)`,
        }}
      />

      {/* Noise texture (CSS) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  )
}

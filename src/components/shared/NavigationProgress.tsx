"use client"

import { useEffect, useRef, useCallback, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Thin progress bar at the very top of the viewport.
 * Uses refs + direct DOM manipulation to avoid React 19 issues.
 *
 * Includes a safety timeout: if the bar has been running for more
 * than 8 seconds without a route change, it auto-finishes.
 */
function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const barRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef(0)
  const activeRef = useRef(false)
  const prevUrlRef = useRef(pathname + searchParams.toString())

  const setBar = useCallback((percent: number, visible: boolean) => {
    progressRef.current = percent
    if (barRef.current) {
      barRef.current.style.width = `${percent}%`
      barRef.current.style.transition =
        percent === 100 ? "width 150ms ease-out" : "width 300ms ease-out"
    }
    if (containerRef.current) {
      containerRef.current.style.opacity = visible ? "1" : "0"
    }
  }, [])

  const finishProgress = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (safetyRef.current) clearTimeout(safetyRef.current)
    timerRef.current = null
    safetyRef.current = null
    activeRef.current = false

    setBar(100, true)

    setTimeout(() => {
      setBar(0, false)
    }, 250)
  }, [setBar])

  const startProgress = useCallback(() => {
    // Don't stack multiple progress bars
    if (activeRef.current) return
    activeRef.current = true

    if (timerRef.current) clearInterval(timerRef.current)
    if (safetyRef.current) clearTimeout(safetyRef.current)

    setBar(15, true)

    timerRef.current = setInterval(() => {
      const prev = progressRef.current
      if (prev >= 90) {
        if (timerRef.current) clearInterval(timerRef.current)
        return
      }
      const increment = Math.max(1, (90 - prev) * 0.08)
      setBar(Math.min(prev + increment, 90), true)
    }, 100)

    // Safety timeout: auto-finish after 8 seconds if route change never came
    safetyRef.current = setTimeout(() => {
      finishProgress()
    }, 8000)
  }, [setBar, finishProgress])

  // ─── Detect route changes ────────────────────────────────────────────
  useEffect(() => {
    const currentUrl = pathname + searchParams.toString()
    if (prevUrlRef.current !== currentUrl) {
      finishProgress()
      prevUrlRef.current = currentUrl
    }
  }, [pathname, searchParams, finishProgress])

  // ─── Detect link clicks ──────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href) return
      // Skip external, hash, and mailto links
      if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return

      // Skip same-page links (compare just the pathname portion)
      try {
        const targetPath = new URL(href, window.location.origin).pathname
        if (targetPath === pathname) return
      } catch {
        if (href === pathname) return
      }

      startProgress()
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [pathname, startProgress])

  // ─── Detect form submissions (sign in / sign up) ────────────────────
  useEffect(() => {
    const handleSubmit = () => startProgress()
    document.addEventListener("submit", handleSubmit, true)
    return () => document.removeEventListener("submit", handleSubmit, true)
  }, [startProgress])

  // ─── Detect page refresh ─────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("beforeunload", startProgress)
    return () => window.removeEventListener("beforeunload", startProgress)
  }, [startProgress])

  // ─── Detect programmatic pushState (router.push) ─────────────────────
  // Only patch pushState, NOT replaceState — Next.js calls replaceState
  // constantly for internal state updates which was causing false triggers.
  useEffect(() => {
    const originalPushState = history.pushState.bind(history)

    history.pushState = function (...args) {
      const newUrl = args[2]
      if (newUrl && typeof newUrl === "string") {
        try {
          const targetPath = new URL(newUrl, window.location.origin).pathname
          if (targetPath !== window.location.pathname) {
            requestAnimationFrame(() => startProgress())
          }
        } catch {
          requestAnimationFrame(() => startProgress())
        }
      }
      return originalPushState(...args)
    }

    const handlePopState = () => startProgress()
    window.addEventListener("popstate", handlePopState)

    return () => {
      history.pushState = originalPushState
      window.removeEventListener("popstate", handlePopState)
    }
  }, [startProgress])

  // ─── Finish on page load (covers refresh) ────────────────────────────
  useEffect(() => {
    if (document.readyState === "complete") return
    const handleLoad = () => finishProgress()
    window.addEventListener("load", handleLoad)
    return () => window.removeEventListener("load", handleLoad)
  }, [finishProgress])

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      style={{ opacity: 0 }}
    >
      <div
        ref={barRef}
        className="h-full bg-hs-green"
        style={{ width: "0%", transition: "width 300ms ease-out" }}
      />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
// src/app/login/LoginForm.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { MorphLogo } from "@/components/MorphLogo"
import { AuthBackdrop } from "@/components/auth/AuthBackdrop"

interface BackdropGame {
  name: string
  screenshot_url: string
  cover_url: string | null
  year: number | null
}

export function LoginForm({ backdropGames }: { backdropGames: BackdropGame[] }) {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full rounded-md text-[15px] px-4 py-3 transition-all duration-200 placeholder:text-zinc-600 outline-none border text-zinc-100 ${
      focused === field
        ? "bg-zinc-800/80 border-[#ff0055]/50 ring-2 ring-[#ff0055]/10"
        : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
    }`

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)]">
      {/* ═══ Full-bleed backdrop ═══ */}
      <div className="absolute inset-0">
        <AuthBackdrop games={backdropGames} />

        {/* Gradient overlays */}
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10]/40 to-transparent z-[1]" />
        {/* Top vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C10]/40 to-transparent z-[1]" />
        {/* Right side — slow gradual fade so art bleeds under the form */}
        <div className="hidden lg:block absolute inset-0 z-[1]"
          style={{
            background: "linear-gradient(to right, transparent 25%, rgba(11,12,16,0.4) 40%, rgba(11,12,16,0.75) 52%, rgba(11,12,16,0.93) 65%, #0B0C10 80%)",
          }}
        />
        {/* Mobile: full darken */}
        <div className="lg:hidden absolute inset-0 bg-zinc-950/75 backdrop-blur-sm z-[1]" />
      </div>

      {/* ═══ Content layer ═══ */}
      <div className="relative z-[2] flex min-h-[calc(100vh-4.5rem)]">
        {/* Left — feature text positioned at vertical center */}
        <div className="hidden lg:flex w-[50%] items-center p-12 pl-16">
          <div className="auth-s1 max-w-[340px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ff0055]/70 mb-5">
              Your gaming journal
            </p>
            <h2 className="font-serif text-[38px] leading-[1.15] text-white/80 mb-5">
              Log games.<br />
              Rate them.<br />
              Share your taste.
            </h2>
            <p className="text-[14px] text-zinc-400 leading-relaxed max-w-[280px]">
              Build your collection, discover what to play next, and see what your friends are into.
            </p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[360px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-12 auth-s1">
              <Link href="/"><MorphLogo /></Link>
            </div>

            {/* Heading */}
            <div className="auth-s1 mb-9">
              <h1 className="font-serif text-[32px] text-zinc-50 leading-tight">
                Sign in
              </h1>
              <p className="mt-2 text-[14px] text-zinc-500">
                Welcome back. Enter your details below.
              </p>
              <div className="mt-4 h-[1px] bg-gradient-to-r from-[#ff0055]/30 via-[#ff0055]/10 to-transparent" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5 auth-s2">
              <div>
                <label className="block text-[13px] font-medium text-zinc-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  required
                  autoComplete="email"
                  className={inputClass("email")}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[13px] font-medium text-zinc-400">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[12px] text-zinc-600 hover:text-[#ff0055] transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    required
                    autoComplete="current-password"
                    className={`${inputClass("password")} pr-11`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-[#ff0055] hover:bg-[#ff1a6b] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-bold py-3.5 rounded-md transition-all duration-200 overflow-hidden shadow-lg shadow-[#ff0055]/10 hover:shadow-[#ff0055]/20 mt-1"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center mt-8 text-[14px] text-zinc-500 auth-s3">
              New here?{" "}
              <Link href="/signup" className="text-[#ff0055] hover:text-[#ff3377] font-semibold transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-s1 { animation: authUp 0.4s ease-out 0.05s both; }
        .auth-s2 { animation: authUp 0.4s ease-out 0.12s both; }
        .auth-s3 { animation: authUp 0.4s ease-out 0.22s both; }
        @keyframes authUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

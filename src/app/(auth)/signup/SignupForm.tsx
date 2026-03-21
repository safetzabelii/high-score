// src/app/signup/SignupForm.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { MorphLogo } from "@/components/MorphLogo"
import { AuthBackdrop } from "@/components/auth/AuthBackdrop"

export function SignupForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters")
      setLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      toast.error("Username can only contain letters, numbers, - and _")
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .single()

    if (existing) {
      toast.error("Username is already taken")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("users") as any).upsert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: username,
        avatar_url: null,
        bio: null,
      })

      toast.success("Account created! Welcome to HIGH-SCORE.")
      router.push("/")
    }

    setLoading(false)
  }

  const inputClass = (field: string) =>
    `w-full bg-zinc-900/60 border text-zinc-100 text-sm px-4 py-3 rounded-md transition-all duration-200 placeholder:text-zinc-600 outline-none ${
      focused === field
        ? "border-[#ff0055]/50 ring-2 ring-[#ff0055]/10 bg-zinc-800/40"
        : "border-zinc-700/50 hover:border-zinc-600/50"
    }`

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)]">
      {/* ═══ Full-bleed backdrop ═══ */}
      <div className="absolute inset-0">
        <AuthBackdrop />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10]/40 to-transparent z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C10]/40 to-transparent z-[1]" />
        {/* Right side — slow gradual fade */}
        <div className="hidden lg:block absolute inset-0 z-[1]"
          style={{
            background: "linear-gradient(to right, transparent 25%, rgba(11,12,16,0.4) 40%, rgba(11,12,16,0.75) 52%, rgba(11,12,16,0.93) 65%, #0B0C10 80%)",
          }}
        />
        {/* Mobile: full darken */}
        <div className="lg:hidden absolute inset-0 bg-zinc-950/80 z-[1]" />
      </div>

      {/* ═══ Content layer ═══ */}
      <div className="relative z-[2] flex min-h-[calc(100vh-4.5rem)]">
        {/* Left — feature text at vertical center */}
        <div className="hidden lg:flex w-[50%] items-center p-12 pl-16">
          <div className="signup-s1 max-w-[340px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ff0055]/60 mb-5">
              Join the community
            </p>
            <h2 className="font-serif text-[38px] leading-[1.15] text-white/80 mb-5">
              Build your<br />
              collection.<br />
              Start playing.
            </h2>
            <p className="text-[14px] text-zinc-400 leading-relaxed max-w-[280px]">
              Thousands of players are already tracking, rating, and discovering their next favorite game.
            </p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[360px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-12 signup-s1">
              <Link href="/"><MorphLogo /></Link>
            </div>

            {/* Heading */}
            <div className="signup-s1 mb-9">
              <h1 className="font-serif text-[32px] text-zinc-50 leading-tight">
                Create account
              </h1>
              <p className="mt-2 text-[14px] text-zinc-500">
                Pick a username and get started.
              </p>
              <div className="mt-4 h-[1px] bg-gradient-to-r from-[#ff0055]/30 via-[#ff0055]/10 to-transparent" />
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-5 signup-s2">
              <div>
                <label className="block text-[13px] font-medium text-zinc-400 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  required
                  minLength={3}
                  maxLength={24}
                  autoComplete="username"
                  className={inputClass("username")}
                  placeholder="your-tag"
                />
              </div>

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
                  placeholder="player@example.com"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass("password")}
                  placeholder="min 6 characters"
                />
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
                    "Create account"
                  )}
                </span>
              </button>
            </form>

            {/* Sign in link */}
            <p className="text-center mt-8 text-[14px] text-zinc-500 signup-s3">
              Already have an account?{" "}
              <Link href="/login" className="text-[#ff0055] hover:text-[#ff3377] font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .signup-s1 { animation: signupUp 0.4s ease-out 0.05s both; }
        .signup-s2 { animation: signupUp 0.4s ease-out 0.12s both; }
        .signup-s3 { animation: signupUp 0.4s ease-out 0.22s both; }
        @keyframes signupUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

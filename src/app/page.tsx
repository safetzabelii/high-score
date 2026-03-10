import { createClient } from '../lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Double-check: middleware protects this, but belt-and-suspenders is good.
  if (!user) redirect('/login')

  const username =
    (user.user_metadata as Record<string, string> | null)?.username ??
    user.email?.split('@')[0] ??
    'there'

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Hey, {username} 👋
        </h1>
        <p className="text-zinc-400">
          You&apos;re logged in as <span className="text-zinc-300">{user.email}</span>
        </p>
      </div>
    </div>
  )
}
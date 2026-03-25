import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CategoryClient } from "@/components/discover/CategoryClient"
import { BaseGame } from "@/components/discover/DiscoverClient"

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params
  const { category } = resolvedParams
  const title = category.charAt(0).toUpperCase() + category.slice(1)
  return {
    title: `${title} Games — Discover`,
  }
}

const validCategories = [
  "popular", "recent", "anticipated", "topRated",
  "hiddenGems", "comingSoon",
  "rpgs", "indies", "shooters", "adventure",
  "strategy", "platformers", "community",
  "fighting", "racing", "sports", "simulators",
  "puzzle", "arcade"
]

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params
  const { category } = resolvedParams
  
  if (!validCategories.includes(category)) {
    redirect("/discover")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirectTo=/discover/${category}`)

  let initialGames: BaseGame[] = []
  let hasMore = true

  if (category === "community") {
    // Community data comes from Supabase directly (needs auth cookies)
    const { data: recentLogs } = await (supabase
      .from("game_logs")
      .select("game_id, games(id, title, slug, cover_url, release_year)")
      .order("created_at", { ascending: false })
      .limit(120) as any)

    const seen = new Set<number>()
    for (const log of (recentLogs ?? []) as any[]) {
      if (log.games && !seen.has(log.game_id)) {
        seen.add(log.game_id)
        initialGames.push(log.games)
        if (initialGames.length >= 30) break
      }
    }
    hasMore = initialGames.length >= 30
  } else {
    // Other categories fetch via API (no auth needed)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/games/discover?category=${category}&limit=30&offset=0`, {
      next: { revalidate: 1800 }
    })

    if (res.ok) {
      const data = await res.json()
      initialGames = data.games || []
      hasMore = data.hasMore ?? true
    }
  }

  return <CategoryClient category={category} initialGames={initialGames} initialHasMore={hasMore} />
}

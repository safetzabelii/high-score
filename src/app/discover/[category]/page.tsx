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

  // Fetch initial batch serverside for SEO / speed
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/games/discover?category=${category}&limit=30&offset=0`, {
    next: { revalidate: 1800 }
  })
  
  let initialGames: BaseGame[] = []
  let hasMore = true

  if (res.ok) {
    const data = await res.json()
    initialGames = data.games || []
    hasMore = data.hasMore ?? true
  }

  return <CategoryClient category={category} initialGames={initialGames} initialHasMore={hasMore} />
}

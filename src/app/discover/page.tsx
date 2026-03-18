import { getDiscoverData } from "@/lib/igdb/discover-cache"
import { DiscoverClient } from "@/components/discover/DiscoverClient"
 
export const metadata = {
  title: "Discover — HIGH-SCORE",
  description: "Discover new games to play.",
}
 
export default async function DiscoverPage() {
  const categories = await getDiscoverData()
 
  return <DiscoverClient categories={categories} />
}
 
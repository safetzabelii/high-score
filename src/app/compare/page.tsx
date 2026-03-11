import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { CompareView } from "@/components/compare/CompareView"
import type { GameLogRow, GameRow, UserRow } from "@/types/database"

export const metadata: Metadata = {
  title: "Compare — HIGH-SCORE",
}

interface ComparePageProps {
  searchParams: Promise<{ with?: string }>
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { with: compareUsername } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/compare")

  // Get current user's profile
  const { data: myProfile } = await (supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single() as any) as { data: UserRow | null }

  // Get following list for dropdown
  const { data: followingData } = await (supabase
    .from("follows")
    .select("following_id, users!follows_following_id_fkey(username, display_name, avatar_url)")
    .eq("follower_id", user.id) as any)

  type FollowWithUser = { following_id: string; users: Pick<UserRow, "username" | "display_name" | "avatar_url"> }
  const following = (followingData ?? []) as FollowWithUser[]

  let comparisonData = null

  if (compareUsername) {
    // Get other user's profile
    const { data: otherUser } = await (supabase
      .from("users")
      .select("*")
      .eq("username", compareUsername)
      .single() as any) as { data: UserRow | null }

    if (otherUser) {
      // Fetch both users' logs with game data
      const [{ data: myLogs }, { data: theirLogs }] = await Promise.all([
        (supabase
          .from("game_logs")
          .select("*, games(*)")
          .eq("user_id", user.id) as any),
        (supabase
          .from("game_logs")
          .select("*, games(*)")
          .eq("user_id", otherUser.id) as any),
      ])

      type LogWithGame = GameLogRow & { games: GameRow }
      const myArr = (myLogs ?? []) as LogWithGame[]
      const theirArr = (theirLogs ?? []) as LogWithGame[]

      // Find games in common
      const myMap = new Map(myArr.map((l) => [l.game_id, l]))
      const commonGames = theirArr
        .filter((l) => myMap.has(l.game_id))
        .map((theirLog) => {
          const myLog = myMap.get(theirLog.game_id)!
          return {
            game_id: theirLog.game_id,
            title: theirLog.games.title,
            slug: theirLog.games.slug,
            cover_url: theirLog.games.cover_url,
            myRating: myLog.rating,
            theirRating: theirLog.rating,
            myStatus: myLog.status,
            theirStatus: theirLog.status,
          }
        })
        .sort((a, b) => a.title.localeCompare(b.title))

      comparisonData = {
        otherUser: {
          username: otherUser.username,
          display_name: otherUser.display_name,
          avatar_url: otherUser.avatar_url,
        },
        commonGames,
        myTotal: myArr.length,
        theirTotal: theirArr.length,
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Compare Games</h1>

      <CompareView
        myUsername={myProfile?.username ?? "You"}
        following={following.map((f) => ({
          username: f.users.username,
          display_name: f.users.display_name,
          avatar_url: f.users.avatar_url,
        }))}
        selectedUsername={compareUsername ?? null}
        comparison={comparisonData}
      />
    </div>
  )
}

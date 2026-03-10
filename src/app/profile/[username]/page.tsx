import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { GameLogGrid } from "@/components/profile/GameLogGrid"
import type { GameStatus } from "@/types/database"

interface ProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params
  return { title: `${username} — HIGH-SCORE` }
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = await params
  const { status: statusFilter } = await searchParams
  const supabase = await createClient()

  // Get current logged-in user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Fetch the profile by username (case-insensitive)
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username)
    .single()

  if (profileError || !profile) notFound()

  // Fetch total count (unfiltered) for "All" tab badge
  const { count: totalCount } = await supabase
    .from("game_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)

  // Fetch game logs with game data joined (optionally filtered)
  let logsQuery = supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", profile.id)
    .order("logged_date", { ascending: false })

  if (
    statusFilter &&
    ["played", "playing", "backlog", "abandoned"].includes(statusFilter)
  ) {
    logsQuery = logsQuery.eq("status", statusFilter as GameStatus)
  }

  const { data: logs } = await logsQuery

  // Fetch stats in parallel
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ])

  // Check if current user follows this profile
  let isFollowing = false
  if (currentUser && currentUser.id !== profile.id) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id)
      .single()
    isFollowing = !!followRow
  }

  const isOwn = currentUser?.id === profile.id

  const stats = {
    gamesLogged: totalCount ?? 0,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <ProfileHeader
        profile={profile}
        stats={stats}
        isOwn={isOwn}
        isFollowing={isFollowing}
        currentUserId={currentUser?.id ?? null}
      />

      <GameLogGrid
        logs={(logs ?? []) as any}
        activeStatus={(statusFilter as GameStatus) ?? null}
        username={username}
        isOwn={isOwn}
        totalCount={totalCount ?? 0}
      />
    </div>
  )
}

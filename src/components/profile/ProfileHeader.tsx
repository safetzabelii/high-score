"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Settings } from "lucide-react"
import { FollowButton } from "./FollowButton"
import { BlockButton } from "./BlockButton"
import type { UserRow } from "@/types/database"
import { MarkdownText } from "@/components/shared/MarkdownText"

interface ProfileHeaderProps {
  profile: UserRow
  stats: {
    gamesLogged: number
    followers: number
    following: number
  }
  ratingDist: Record<string, number>
  isOwn: boolean
  isFollowing: boolean
  currentUserId: string | null
  isBlocked?: boolean
  isBlockedBy?: boolean
}

export function ProfileHeader({
  profile,
  stats,
  ratingDist,
  isOwn,
  isFollowing,
  currentUserId,
  isBlocked = false,
  isBlockedBy = false,
}: ProfileHeaderProps) {
  const distEntries = Object.entries(ratingDist).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  )
  const maxDist = Math.max(...distEntries.map(([, c]) => c), 1)
  const totalRated = distEntries.reduce((s, [, c]) => s + c, 0)

  // If the profile owner blocked the current user
  if (isBlockedBy) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-center py-16">
          <p className="text-zinc-500 text-sm">This profile is not available</p>
        </div>
      </div>
    )
  }

  // If the current user blocked this profile
  if (isBlocked) {
    return (
      <div className="mb-6">
        {/* Banner */}
        <div className="relative h-32 sm:h-44 -mx-4 sm:-mx-6 mb-5 overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 -mt-16 ring-4 ring-zinc-950">
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon className="h-10 w-10 text-zinc-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-normal text-zinc-50 tracking-tight">
                {profile.display_name || profile.username}
              </h1>
              {currentUserId && (
                <BlockButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  initialBlocked={true}
                />
              )}
            </div>
            <p className="mt-4 text-zinc-500 text-sm">You have blocked this user</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Banner */}
      <div className="relative h-32 sm:h-44 -mx-4 sm:-mx-6 mb-5 overflow-hidden rounded-lg">
        {profile.banner_url ? (
          <Image
            src={profile.banner_url}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: `center ${profile.banner_y ?? 50}%` }}
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Avatar — 100px circle like Letterboxd */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 -mt-16 ring-4 ring-zinc-950">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon className="h-10 w-10 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Info + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-normal text-zinc-50 tracking-tight">
              {profile.display_name || profile.username}
            </h1>

            {isOwn ? (
              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-sm border border-zinc-700/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
              >
                <Settings className="h-3 w-3" />
                Edit
              </Link>
            ) : currentUserId ? (
              <>
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  initialFollowing={isFollowing}
                />
                <BlockButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  initialBlocked={false}
                />
              </>
            ) : null}
          </div>

          {profile.bio && (
            <div className="mt-2 max-w-lg">
              <MarkdownText className="text-[13px] text-zinc-400">
                {profile.bio}
              </MarkdownText>
            </div>
          )}

        </div>

        {/* Stats row — compact inline */}
        <div className="flex flex-col items-start gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-zinc-400">
              <span className="font-bold text-zinc-100 tabular-nums">{stats.gamesLogged}</span> Games
            </span>
            <span className="text-zinc-700">&middot;</span>
            <span className="text-zinc-400">
              <span className="font-bold text-zinc-100 tabular-nums">{stats.following}</span> Following
            </span>
            <span className="text-zinc-700">&middot;</span>
            <span className="text-zinc-400">
              <span className="font-bold text-zinc-100 tabular-nums">{stats.followers}</span> Followers
            </span>
          </div>

          {/* Rating distribution — compact bar chart */}
          {totalRated > 0 && (
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ratings</span>
                <span className="text-[10px] text-zinc-600 tabular-nums">{totalRated}</span>
              </div>
              <div className="flex items-end gap-[2px] h-8 w-full sm:w-48">
                {distEntries.map(([rating, count]) => (
                  <div key={rating} className="flex-1 flex items-end h-full">
                    <div
                      className="w-full bg-zinc-700 hover:bg-[#ff0055] transition-colors rounded-t-[1px]"
                      style={{
                        height: count > 0 ? `${Math.max((count / maxDist) * 100, 8)}%` : "1px",
                        opacity: count > 0 ? 1 : 0.15,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[7px] text-zinc-600">½</span>
                <span className="text-[7px] text-zinc-600">★★★★★</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

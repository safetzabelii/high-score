"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Settings } from "lucide-react"
import { FollowButton } from "./FollowButton"
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
}

export function ProfileHeader({
  profile,
  stats,
  ratingDist,
  isOwn,
  isFollowing,
  currentUserId,
}: ProfileHeaderProps) {
  const distEntries = Object.entries(ratingDist).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  )
  const maxDist = Math.max(...distEntries.map(([, c]) => c), 1)
  const totalRated = distEntries.reduce((s, [, c]) => s + c, 0)
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
              <FollowButton
                targetUserId={profile.id}
                currentUserId={currentUserId}
                initialFollowing={isFollowing}
              />
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

        {/* Stats + Ratings chart */}
        <div className="flex items-start gap-4 sm:gap-6 flex-shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-semibold text-zinc-100 tabular-nums">{stats.gamesLogged}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Games</p>
            </div>
            <div className="text-center">
              <p className="text-lg sm:text-xl font-semibold text-zinc-100 tabular-nums">{stats.following}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg sm:text-xl font-semibold text-zinc-100 tabular-nums">{stats.followers}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Followers</p>
            </div>
          </div>

          {/* Rating distribution — compact sidebar chart */}
          {totalRated > 0 && (
            <div className="sm:border-l sm:border-zinc-800 sm:pl-5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ratings</span>
                <span className="text-[10px] text-zinc-600 tabular-nums">{totalRated}</span>
              </div>
              <div className="flex items-end gap-[2px] h-10 w-full sm:w-40">
                {distEntries.map(([rating, count]) => (
                  <div key={rating} className="flex-1 flex items-end h-full">
                    <div
                      className="w-full bg-zinc-600 hover:bg-[#ff0055] transition-colors"
                      style={{
                        height: count > 0 ? `${Math.max((count / maxDist) * 100, 8)}%` : "1px",
                        opacity: count > 0 ? 1 : 0.15,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[7px] text-zinc-600">★</span>
                <span className="text-[7px] text-zinc-600">★★★★★</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

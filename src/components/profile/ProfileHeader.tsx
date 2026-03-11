"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Calendar, Settings } from "lucide-react"
import { FollowButton } from "./FollowButton"
import type { UserRow } from "@/types/database"

interface ProfileHeaderProps {
  profile: UserRow
  stats: {
    gamesLogged: number
    followers: number
    following: number
  }
  isOwn: boolean
  isFollowing: boolean
  currentUserId: string | null
}

export function ProfileHeader({
  profile,
  stats,
  isOwn,
  isFollowing,
  currentUserId,
}: ProfileHeaderProps) {
  const joinDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="mb-8">
      {/* Top banner area — subtle gradient */}
      <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 pt-6 pb-8 mb-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/[0.04] to-transparent" />

        <div className="relative flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-700/40 bg-zinc-800 shadow-2xl">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-600/20 to-purple-600/20">
                <UserIcon className="h-8 w-8 text-zinc-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-50 truncate tracking-tight">
                {profile.display_name || profile.username}
              </h1>

              {isOwn ? (
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700/60 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
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

            <p className="text-sm text-zinc-600 mt-0.5 font-mono">@{profile.username}</p>

            {profile.bio && (
              <p className="mt-2.5 text-sm text-zinc-400 max-w-lg leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats row — Letterboxd style: clean inline numbers */}
            <div className="mt-4 flex items-center gap-5 text-sm">
              <span className="text-zinc-500">
                <span className="font-bold text-zinc-200 font-mono tabular-nums">{stats.gamesLogged}</span> games
              </span>
              <span className="text-zinc-500">
                <span className="font-bold text-zinc-200 font-mono tabular-nums">{stats.following}</span> following
              </span>
              <span className="text-zinc-500">
                <span className="font-bold text-zinc-200 font-mono tabular-nums">{stats.followers}</span> followers
              </span>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
              <Calendar className="h-3 w-3" />
              Member since {joinDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

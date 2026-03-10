"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Calendar, Gamepad2, Users, UserPlus } from "lucide-react"
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
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {/* Avatar */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon className="h-10 w-10 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-50 truncate">
              {profile.display_name || profile.username}
            </h1>
            <span className="text-sm text-zinc-500">@{profile.username}</span>

            {isOwn ? (
              <Link
                href="/settings"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
              >
                Edit Profile
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
            <p className="mt-2 text-sm text-zinc-400 max-w-lg leading-relaxed">{profile.bio}</p>
          )}

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-5 text-sm">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Gamepad2 className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-zinc-200 tabular-nums">{stats.gamesLogged}</span>
              <span>games</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Users className="h-4 w-4" />
              <span className="font-semibold text-zinc-200 tabular-nums">{stats.followers}</span>
              <span>followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <UserPlus className="h-4 w-4" />
              <span className="font-semibold text-zinc-200 tabular-nums">{stats.following}</span>
              <span>following</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
            <Calendar className="h-3 w-3" />
            Joined {joinDate}
          </div>
        </div>
      </div>
    </div>
  )
}

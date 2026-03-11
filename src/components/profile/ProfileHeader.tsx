"use client"

import Image from "next/image"
import Link from "next/link"
import { User as UserIcon, Settings } from "lucide-react"
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
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Avatar — 100px circle like Letterboxd */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800">
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
            <p className="mt-2 text-[13px] text-zinc-400 max-w-lg leading-relaxed font-serif">{profile.bio}</p>
          )}
        </div>

        {/* Stats — Letterboxd right-aligned numbers */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-100 tabular-nums">{stats.gamesLogged}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Games</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-100 tabular-nums">{stats.following}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Following</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-100 tabular-nums">{stats.followers}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Followers</p>
          </div>
        </div>
      </div>
    </div>
  )
}

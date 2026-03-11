import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Globe, Lock, Gamepad2, User as UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AddGameToList } from "@/components/lists/AddGameToList"
import { RemoveListItem } from "@/components/lists/RemoveListItem"
import { SortableListItems } from "@/components/lists/SortableListItems"
import type { ListRow, ListItemRow, UserRow, GameRow } from "@/types/database"

interface ListPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: list } = await (supabase
    .from("lists")
    .select("title, description")
    .eq("id", id)
    .single() as any)

  const title = list ? `${list.title} — HIGH-SCORE` : "List — HIGH-SCORE"
  const description = list?.description || "A curated game list on HIGH-SCORE"

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function ListDetailPage({ params }: ListPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Fetch list with owner info
  const { data: list } = await (supabase
    .from("lists")
    .select("*, users(*)")
    .eq("id", id)
    .single() as any)

  if (!list) notFound()

  const typedList = list as ListRow & { users: UserRow }

  // Check access: private lists only visible to owner
  const isOwner = currentUser?.id === typedList.user_id
  if (!typedList.is_public && !isOwner) notFound()

  // Fetch list items with game data
  const { data: rawItems } = await (supabase
    .from("list_items")
    .select("*, games(*)")
    .eq("list_id", id)
    .order("position", { ascending: true }) as any)

  type ItemWithGame = ListItemRow & { games: GameRow }
  const items = (rawItems ?? []) as ItemWithGame[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-zinc-50">{typedList.title}</h1>
              {typedList.is_public ? (
                <Globe className="h-4 w-4 text-zinc-500" />
              ) : (
                <Lock className="h-4 w-4 text-zinc-500" />
              )}
            </div>
            {typedList.description && (
              <p className="text-sm text-zinc-400 mt-1">{typedList.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <Link
                href={`/profile/${typedList.users.username}`}
                className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
              >
                <div className="relative h-5 w-5 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                  {typedList.users.avatar_url ? (
                    <Image
                      src={typedList.users.avatar_url}
                      alt={typedList.users.display_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserIcon className="h-2.5 w-2.5 text-zinc-600" />
                    </div>
                  )}
                </div>
                {typedList.users.display_name}
              </Link>
              <span>·</span>
              <span>{items.length} {items.length === 1 ? "game" : "games"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add game (owner only) */}
      {isOwner && (
        <div className="mb-6">
          <AddGameToList listId={id} existingGameIds={items.map((i) => i.game_id)} nextPosition={items.length} />
        </div>
      )}

      {/* Game list */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            {isOwner ? "No games yet. Search and add games above!" : "This list is empty."}
          </p>
        </div>
      ) : (
        <SortableListItems
          items={items as any}
          listId={id}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}

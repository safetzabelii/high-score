import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Globe, Lock, Gamepad2, User as UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AddGameToList } from "@/components/lists/AddGameToList"
import { RemoveListItem } from "@/components/lists/RemoveListItem"
import { SortableListItems } from "@/components/lists/SortableListItems"
import { ListCoverStack } from "@/components/lists/ListCoverStack"
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
      {/* Premium Header Layout */}
      <div className="mb-10 flex flex-col sm:flex-row gap-6 sm:gap-8 border-b border-zinc-800/60 pb-8">
        {/* Large Stacked Covers */}
        <div className="w-[140px] h-[196px] sm:w-[180px] sm:h-[252px] shrink-0 mx-auto sm:mx-0">
          <ListCoverStack 
            covers={items.map((i) => i.games.cover_url)} 
            totalItems={items.length} 
            maxCovers={5} 
          />
        </div>

        {/* Text Info */}
        <div className="flex flex-col justify-end pt-4 sm:pt-0">
          <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
            {typedList.is_public ? (
              <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
            ) : (
              <Lock className="h-4 w-4 text-zinc-500 shrink-0" />
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-50 tracking-tight text-center sm:text-left leading-tight">
              {typedList.title}
            </h1>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-sm font-semibold text-zinc-400">
            <Link
              href={`/profile/${typedList.users.username}`}
              className="flex items-center gap-2 hover:text-zinc-200 transition-colors bg-zinc-800/50 py-1.5 px-3 rounded-full border border-zinc-700/50"
            >
              <div className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                {typedList.users.avatar_url ? (
                  <Image
                    src={typedList.users.avatar_url}
                    alt={typedList.users.display_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserIcon className="h-3 w-3 text-zinc-600" />
                  </div>
                )}
              </div>
              <span className="text-zinc-200 tracking-wide uppercase text-xs">{typedList.users.display_name}</span>
            </Link>
            
            <span className="hidden sm:inline text-zinc-600">|</span>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-zinc-400">
              <span className="tracking-wide uppercase text-xs font-bold text-zinc-500">Total Games</span>
              <span className="text-hs-blue">{items.length}</span>
            </div>
            
            <span className="hidden sm:inline text-zinc-600">|</span>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-zinc-400">
              <span className="tracking-wide uppercase text-xs font-bold text-zinc-500">Updated</span>
              <span>{new Date(typedList.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          {typedList.description && (
            <div className="mt-6 bg-zinc-900/40 p-4 rounded-lg border border-zinc-800/60 max-w-2xl text-center sm:text-left">
              <p className="text-sm text-zinc-300 leading-relaxed max-w-prose">
                {typedList.description}
              </p>
            </div>
          )}
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

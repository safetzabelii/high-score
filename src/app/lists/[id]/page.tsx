import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Globe, Lock, Gamepad2, User as UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { AddGameToList } from "@/components/lists/AddGameToList"
import { SortableListItems } from "@/components/lists/SortableListItems"
import { GameCover } from "@/components/shared/GameCover"
import { ShareButton } from "@/components/shared/ShareButton"
import type { ListRow, ListItemRow, UserRow, GameRow } from "@/types/database"

interface ListPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: list } = await (supabase
    .from("lists")
    .select("title, description, is_public")
    .eq("id", id)
    .eq("is_public", true)
    .single() as any)

  const title = list ? `${list.title} — HIGH-SCORE` : "List — HIGH-SCORE"
  const description = list?.description || "A curated game list on HIGH-SCORE"

  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "HIGH-SCORE" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function ListDetailPage({ params }: ListPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const serviceDb = createServiceClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data: list } = await (serviceDb
    .from("lists")
    .select("*, users(*)")
    .eq("id", id)
    .single() as any)

  if (!list) notFound()

  const typedList = list as ListRow & { users: UserRow }
  const isOwner = currentUser?.id === typedList.user_id
  if (!typedList.is_public && !isOwner) notFound()

  const { data: rawItems } = await (serviceDb
    .from("list_items")
    .select("*, games(*)")
    .eq("list_id", id)
    .order("position", { ascending: true }) as any)

  type ItemWithGame = ListItemRow & { games: GameRow }
  const items = (rawItems ?? []) as ItemWithGame[]

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:py-10 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-8 pb-6 border-b border-zinc-800/60">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-500 block mb-2">
              {typedList.is_public ? "Public List" : "Private List"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-50 tracking-tight leading-tight">
              {typedList.title}
            </h1>
          </div>
          <ShareButton url={`/lists/${id}`} title={typedList.title} />
        </div>

        <div className="flex items-center gap-3 mt-4 text-[12px] text-zinc-500">
          <Link
            href={`/profile/${typedList.users.username}`}
            className="flex items-center gap-2 hover:text-zinc-200 transition-colors"
          >
            <div className="relative h-5 w-5 overflow-hidden rounded-full bg-zinc-800">
              {typedList.users.avatar_url ? (
                <Image
                  src={typedList.users.avatar_url}
                  alt={typedList.users.display_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserIcon className="h-2.5 w-2.5 text-zinc-600" />
                </div>
              )}
            </div>
            <span className="font-semibold text-zinc-300">{typedList.users.display_name}</span>
          </Link>
          <span className="text-zinc-800">&middot;</span>
          <span className="font-bold text-zinc-400 tabular-nums">{items.length}</span>
          <span>{items.length === 1 ? "game" : "games"}</span>
          <span className="text-zinc-800">&middot;</span>
          <span>Updated {new Date(typedList.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>

        {typedList.description && (
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-2xl">
            {typedList.description}
          </p>
        )}
      </div>

      {/* Add game (owner only) */}
      {isOwner && (
        <div className="mb-6">
          <AddGameToList listId={id} existingGameIds={items.map((i) => i.game_id)} nextPosition={items.length} />
        </div>
      )}

      {/* ── Game Grid ── */}
      {items.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-800/60 rounded-lg">
          <Gamepad2 className="mx-auto h-8 w-8 text-zinc-800 mb-3" />
          <p className="text-sm text-zinc-600">
            {isOwner ? "No games yet. Search and add games above!" : "This list is empty."}
          </p>
        </div>
      ) : isOwner ? (
        <SortableListItems
          items={items as any}
          listId={id}
          isOwner={isOwner}
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="relative group">
              <GameCover
                slug={item.games.slug}
                title={item.games.title}
                coverUrl={item.games.cover_url}
                className="w-full"
                showTitle
              />
              {/* Rank badge */}
              <div className="absolute top-1.5 left-1.5 bg-zinc-950/80 backdrop-blur-sm px-1.5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-zinc-300 border border-zinc-700/50 tabular-nums">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

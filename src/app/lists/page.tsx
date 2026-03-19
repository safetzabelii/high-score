import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { Plus, List, Lock, Globe, Gamepad2 } from "lucide-react"
import type { ListRow, UserRow } from "@/types/database"

export const metadata = {
  title: "Lists — HIGH-SCORE",
}

export default async function ListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: publicData } = await (supabase
    .from("lists")
    .select(`
      *,
      users(*),
      list_items(
        position,
        games(cover_url, title, slug)
      )
    `)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(50) as any)

  const publicLists = (publicData ?? []).map((list: ListRow & { list_items: any[] }) => {
    const sortedItems = [...(list.list_items || [])].sort((a, b) => a.position - b.position)
    return {
      ...list,
      preview_items: sortedItems.slice(0, 5).map((i: any) => ({
        cover_url: i.games?.cover_url,
        title: i.games?.title,
        slug: i.games?.slug,
      })),
      total_count: list.list_items?.length || 0,
    }
  })

  let myLists: any[] = []
  if (user) {
    const { data: rawMyLists } = await (supabase
      .from("lists")
      .select(`
        *,
        users(*),
        list_items(
          position,
          games(cover_url, title, slug)
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }) as any)

    myLists = (rawMyLists ?? []).map((list: ListRow & { list_items: any[] }) => {
      const sortedItems = [...(list.list_items || [])].sort((a, b) => a.position - b.position)
      return {
        ...list,
        preview_items: sortedItems.slice(0, 5).map((i: any) => ({
          cover_url: i.games?.cover_url,
          title: i.games?.title,
          slug: i.games?.slug,
        })),
        total_count: list.list_items?.length || 0,
      }
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-50">Lists</h1>
        {user && (
          <Link
            href="/lists/new"
            className="inline-flex items-center gap-2 rounded-sm bg-[#ff0055] hover:bg-[#e6004c] text-white px-4 py-2 text-sm font-bold transition-all"
          >
            <Plus className="h-4 w-4" />
            New List
          </Link>
        )}
      </div>

      {/* My Lists */}
      {myLists.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">My Lists</h2>
          <div className="space-y-4">
            {myLists.map((list: any) => (
              <ListCard key={list.id} list={list} showUser={false} />
            ))}
          </div>
        </section>
      )}

      {/* Public Lists */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">Community Lists</h2>
        {publicLists.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-16 text-center">
            <List className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No public lists yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {publicLists.map((list: any) => (
              <ListCard key={list.id} list={list} showUser />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ListCard({
  list,
  showUser,
}: {
  list: any
  showUser: boolean
}) {
  const itemCount = list.total_count ?? 0
  const previews = list.preview_items ?? []

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group block rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700 transition-all duration-200 overflow-hidden"
    >
      {/* Top section — poster strip preview */}
      <div className="relative h-[120px] bg-zinc-900 overflow-hidden">
        {previews.length > 0 ? (
          <div className="flex h-full">
            {previews.map((item: any, i: number) => (
              <div key={i} className="relative flex-1 min-w-0 h-full">
                {item.cover_url ? (
                  <Image
                    src={item.cover_url}
                    alt={item.title || ""}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="200px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                    <Gamepad2 className="h-4 w-4 text-zinc-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-zinc-800" />
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
        {/* Item count badge */}
        <div className="absolute bottom-3 right-3 bg-zinc-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-bold text-zinc-300 tabular-nums border border-zinc-700/50">
          {itemCount} {itemCount === 1 ? "game" : "games"}
        </div>
      </div>

      {/* Bottom section — list info */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-zinc-100 group-hover:text-[#ff0055] transition-colors truncate">
            {list.title}
          </h3>
          {list.is_public ? (
            <Globe className="h-3 w-3 text-zinc-600 shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-zinc-600 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
          {showUser && list.users && (
            <>
              <span className="text-zinc-400">{list.users.display_name}</span>
              <span className="text-zinc-700">·</span>
            </>
          )}
          <span>Updated {new Date(list.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
        {list.description && (
          <p className="text-[12px] text-zinc-500 mt-1.5 line-clamp-1">
            {list.description}
          </p>
        )}
      </div>
    </Link>
  )
}

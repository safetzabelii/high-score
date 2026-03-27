import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { Plus, Lock, Globe, Gamepad2 } from "lucide-react"
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
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:py-10 sm:px-6">
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-10 pb-6 border-b border-zinc-800/60">
        <div>
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-500 block mb-1">Curated</span>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-50 tracking-tight">Lists</h1>
        </div>
        {user && (
          <Link
            href="/lists/new"
            className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white hover:bg-zinc-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New List
          </Link>
        )}
      </div>

      {/* ── My Lists ── */}
      {myLists.length > 0 && (
        <section className="mb-12">
          <h2 className="section-heading text-zinc-500 mb-5">My Lists</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myLists.map((list: any) => (
              <ListCard key={list.id} list={list} showUser={false} />
            ))}
          </div>
        </section>
      )}

      {/* ── Community Lists ── */}
      <section>
        <h2 className="section-heading text-zinc-500 mb-5">Community Lists</h2>
        {publicLists.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-800/60 rounded-lg">
            <Gamepad2 className="mx-auto h-8 w-8 text-zinc-800 mb-3" />
            <p className="text-sm text-zinc-600">No public lists yet</p>
            {user && (
              <Link href="/lists/new" className="inline-block mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Be the first to create one
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  const previews = (list.preview_items ?? []).slice(0, 5)

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group block rounded-lg overflow-hidden border border-zinc-800/60 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all"
    >
      {/* Cover strip — offset stacked covers */}
      <div className="relative h-28 bg-zinc-900/60 overflow-hidden">
        {previews.length > 0 ? (
          <div className="absolute inset-0 flex">
            {previews.map((item: any, i: number) => (
              <div
                key={i}
                className="relative flex-1 min-w-0 h-full"
              >
                {item.cover_url ? (
                  <Image
                    src={item.cover_url}
                    alt={item.title || ""}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="160px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                    <Gamepad2 className="h-3 w-3 text-zinc-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gamepad2 className="h-6 w-6 text-zinc-800" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

        {/* Count + visibility */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 tabular-nums tracking-wider">
            {itemCount} {itemCount === 1 ? "GAME" : "GAMES"}
          </span>
          {list.is_public ? (
            <Globe className="h-3 w-3 text-zinc-600" />
          ) : (
            <Lock className="h-3 w-3 text-zinc-600" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-3.5 py-3">
        <h3 className="text-[14px] font-semibold text-zinc-200 group-hover:text-zinc-300 truncate transition-colors leading-tight">
          {list.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-600">
          {showUser && list.users && (
            <>
              <span className="text-zinc-500">{list.users.display_name || list.users.username}</span>
              <span className="text-zinc-800">&middot;</span>
            </>
          )}
          <span>Updated {new Date(list.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
        {list.description && (
          <p className="text-[11px] text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">{list.description}</p>
        )}
      </div>
    </Link>
  )
}

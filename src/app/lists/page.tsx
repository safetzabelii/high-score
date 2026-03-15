import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Plus, List, Lock, Globe } from "lucide-react"
import type { ListRow, UserRow } from "@/types/database"
import { ListCoverStack } from "@/components/lists/ListCoverStack"

export const metadata = {
  title: "Lists — HIGH-SCORE",
}

type ListWithDetails = ListRow & {
  users: UserRow
  list_items: { count: number }[] | { position: number, games: { cover_url: string | null } }[] 
  total_count?: number
}

export default async function ListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // To fetch both a total count AND a few items with covers, we need two queries 
  // or a complex RPC/View. For simplicity in Next.js Server Components, we can 
  // do one query for the list and items (with limit), and another for counts, 
  // or we can just fetch the first 4 items with games, and fetch the total count separately.

  // Let's modify the query to get exactly what we need:
  // 1. The list details + user
  // 2. The first 4 list items (ordered by position) WITH their game covers.
  // 3. The total count of list items.
  // Supabase limits on nested selects: list_items(id, position, games(cover_url)) with foreignTable limit.

  const { data: rawLists } = await supabase
    .from("lists")
    .select("*, users(*), list_items!inner(id), items:list_items(id, position, games(cover_url))")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(50)

  // Wait, there's a better way to do this without complex `.limit` on foreign tables that might not work perfectly with types.
  // We can just query `lists` and `list_items(position, games(cover_url))`, order by position, limit 4.
  const { data: publicData } = await (supabase
    .from("lists")
    .select(`
      *,
      users(*),
      list_items(
        position,
        games(cover_url)
      )
    `)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(50) as any)

  const publicLists = (publicData ?? []).map((list: ListRow & { list_items: any[] }) => {
    // Sort items by position manually just in case
    const sortedItems = [...(list.list_items || [])].sort((a, b) => a.position - b.position)
    return {
      ...list,
      preview_covers: sortedItems.map(i => i.games?.cover_url).slice(0, 4),
      total_count: list.list_items?.length || 0
    }
  })

  // Fetch user's own lists (public + private)
  let myLists: any[] = []
  if (user) {
    const { data: rawMyLists } = await (supabase
      .from("lists")
      .select(`
        *,
        users(*),
        list_items(
          position,
          games(cover_url)
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }) as any)
      
    myLists = (rawMyLists ?? []).map((list: ListRow & { list_items: any[] }) => {
      const sortedItems = [...(list.list_items || [])].sort((a, b) => a.position - b.position)
      return {
        ...list,
        preview_covers: sortedItems.map(i => i.games?.cover_url).slice(0, 4),
        total_count: list.list_items?.length || 0
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
            className="inline-flex items-center gap-2 rounded-sm bg-hs-green-button hover:bg-hs-green-hover text-white px-4 py-2 text-sm font-medium transition-all"
          >
            <Plus className="h-4 w-4" />
            New List
          </Link>
        )}
      </div>

      {/* My Lists */}
      {myLists.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">My Lists</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {myLists.map((list: any) => (
              <ListCard key={list.id} list={list} showUser={false} />
            ))}
          </div>
        </section>
      )}

      {/* Public Lists */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Community Lists</h2>
        {publicLists.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
            <List className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No public lists yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
  list: ListWithDetails & { preview_covers?: (string | null)[] }
  showUser: boolean
}) {
  const itemCount = list.total_count ?? 0

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group flex flex-col gap-4 rounded-[4px] border border-zinc-800/80 bg-zinc-900/40 p-4 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all duration-300 relative overflow-hidden"
    >
      <div className="flex gap-4">
        {/* Cover Stack Area */}
        <div className="w-[100px] sm:w-[120px] shrink-0 h-[140px] sm:h-[160px]">
          <ListCoverStack 
            covers={list.preview_covers || []} 
            totalItems={itemCount} 
            maxCovers={4} 
          />
        </div>

        {/* Text Info Area */}
        <div className="flex flex-col flex-1 min-w-0 py-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-base font-bold text-zinc-100 group-hover:text-hs-blue transition-colors line-clamp-2 leading-tight">
              {list.title}
            </h3>
            {list.is_public ? (
              <Globe className="h-3 w-3 text-zinc-600 shrink-0" />
            ) : (
              <Lock className="h-3 w-3 text-zinc-600 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 tracking-wide uppercase mb-2">
            {showUser && list.users && (
              <>
                <span className="text-zinc-400">By {list.users.display_name}</span>
                <span>·</span>
              </>
            )}
            <span>{itemCount} {itemCount === 1 ? "game" : "games"}</span>
          </div>

          {list.description && (
            <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
              {list.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

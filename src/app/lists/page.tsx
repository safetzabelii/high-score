import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Plus, List, Lock, Globe } from "lucide-react"
import type { ListRow, UserRow } from "@/types/database"

export const metadata = {
  title: "Lists — HIGH-SCORE",
}

export default async function ListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch public lists with user info and item count
  const { data: rawLists } = await (supabase
    .from("lists")
    .select("*, users(*), list_items(count)")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(50) as any)

  type ListWithUser = ListRow & { users: UserRow; list_items: { count: number }[] }
  const publicLists = (rawLists ?? []) as ListWithUser[]

  // Fetch user's own lists (public + private)
  let myLists: ListWithUser[] = []
  if (user) {
    const { data: rawMyLists } = await (supabase
      .from("lists")
      .select("*, users(*), list_items(count)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }) as any)
    myLists = (rawMyLists ?? []) as ListWithUser[]
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-50">Lists</h1>
        {user && (
          <Link
            href="/lists/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-medium transition-all"
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
          <div className="grid gap-3 sm:grid-cols-2">
            {myLists.map((list) => (
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
          <div className="grid gap-3 sm:grid-cols-2">
            {publicLists.map((list) => (
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
  list: ListRow & { users: UserRow; list_items: { count: number }[] }
  showUser: boolean
}) {
  const itemCount = list.list_items?.[0]?.count ?? 0

  return (
    <Link
      href={`/lists/${list.id}`}
      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
        <List className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-200 truncate">{list.title}</p>
          {list.is_public ? (
            <Globe className="h-3 w-3 text-zinc-600 flex-shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-zinc-600 flex-shrink-0" />
          )}
        </div>
        {list.description && (
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{list.description}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
          <span>{itemCount} {itemCount === 1 ? "game" : "games"}</span>
          {showUser && list.users && (
            <>
              <span>·</span>
              <span>by {list.users.display_name}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

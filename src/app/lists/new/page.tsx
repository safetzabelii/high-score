import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CreateListForm } from "@/components/lists/CreateListForm"

export const metadata = {
  title: "New List — HIGH-SCORE",
}

export default async function NewListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/lists/new")

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-50 mb-8">Create a List</h1>
      <CreateListForm />
    </div>
  )
}

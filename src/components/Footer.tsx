import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 mt-12">
      <div className="mx-auto max-w-[960px] px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <Link href="/stats" className="hover:text-zinc-300 transition-colors">Stats</Link>
            <Link href="/backlog" className="hover:text-zinc-300 transition-colors">Backlog</Link>
            <Link href="/lists" className="hover:text-zinc-300 transition-colors">Lists</Link>
            <Link href="/settings" className="hover:text-zinc-300 transition-colors">Settings</Link>
            <Link href="/recommendations" className="hover:text-zinc-300 transition-colors">Discover</Link>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-hs-orange" />
            <span className="h-2 w-2 rounded-full bg-hs-green" />
            <span className="h-2 w-2 rounded-full bg-hs-blue" />
          </div>
        </div>
        <p className="text-center text-[11px] text-zinc-600 mt-4">
          HIGH-SCORE. Game data from IGDB.
        </p>
      </div>
    </footer>
  )
}

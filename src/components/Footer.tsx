import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 mt-12">
      <div className="mx-auto max-w-[960px] px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Navigation links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-zinc-500">
            <Link href="/discover" className="hover:text-zinc-300 transition-colors">Games</Link>
            <Link href="/lists" className="hover:text-zinc-300 transition-colors">Lists</Link>
            <Link href="/search?tab=users" className="hover:text-zinc-300 transition-colors">Members</Link>
            <Link href="/activity" className="hover:text-zinc-300 transition-colors">Activity</Link>
            <Link href="/stats" className="hover:text-zinc-300 transition-colors">Stats</Link>
            <Link href="/compare" className="hover:text-zinc-300 transition-colors">Compare</Link>
            <Link href="/roadmap" className="hover:text-zinc-300 transition-colors">Roadmap</Link>
          </nav>

          {/* Right: Brand dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-hs-orange" />
            <span className="h-2 w-2 rounded-full bg-hs-green" />
            <span className="h-2 w-2 rounded-full bg-hs-blue" />
          </div>
        </div>
        <p className="text-center text-[11px] text-zinc-600 mt-4">
          HIGH-SCORE &mdash; Track your games. Game data from{" "}
          <a href="https://www.igdb.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">IGDB</a>.
        </p>
      </div>
    </footer>
  )
}

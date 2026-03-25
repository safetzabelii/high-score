import type { Metadata } from "next"
import { CheckCircle2, Clock, Compass, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "Roadmap — HIGH-SCORE",
  description:
    "See what we're building and what's coming next for HIGH-SCORE.",
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type RoadmapItem = {
  title: string
  description: string
  tag?: string
}

const completed: RoadmapItem[] = [
  { title: "Game logging", description: "Rate, review, and track playtime for every game you play." },
  { title: "Game search", description: "Search any game powered by the IGDB database." },
  { title: "User profiles", description: "Customizable profiles with banners, avatars, and bios." },
  { title: "Follow system & activity feed", description: "Follow friends and see what they're playing." },
  { title: "Custom game lists", description: "Create lists with drag-to-reorder support." },
  { title: "Game discovery", description: "Browse and filter games by genre, platform, and more.", tag: "New" },
  { title: "DLC & edition tracking", description: "Track DLCs and special editions separately." },
  { title: "Comments & likes", description: "Comment on and like other players' reviews." },
  { title: "Favorite games showcase", description: "Pin your favorite games to your profile." },
  { title: "CSV export", description: "Export your full game library as a CSV file." },
  { title: "Notifications", description: "Get notified about likes, comments, and new followers." },
  { title: "Multiple playthroughs", description: "Log multiple playthroughs of the same game." },
]

const inProgress: RoadmapItem[] = [
  { title: "Steam import", description: "Import your Steam library and playtime automatically.", tag: "New" },
  { title: "CSV import", description: "Import game data from other platforms via CSV." },
  { title: "Block users", description: "Block users to hide their content from your feed." },
  { title: "Account deletion", description: "Self-service account and data deletion." },
  { title: "Game awards display", description: "Showcase awards and accolades on game pages.", tag: "Improvement" },
]

const planned: RoadmapItem[] = [
  { title: "PlayStation import", description: "Sync your PlayStation trophy and game library." },
  { title: "Xbox import", description: "Sync your Xbox achievements and game library." },
  { title: "Social sharing", description: "Share reviews and lists to social platforms.", tag: "Improvement" },
  { title: "Achievement tracking", description: "Track in-game achievements across platforms." },
  { title: "Recommendations engine", description: "Get personalized game recommendations based on your taste." },
  { title: "Mobile app", description: "A native mobile experience for iOS and Android.", tag: "New" },
  { title: "Community events", description: "Join community challenges and gaming events." },
  { title: "Mod support tracking", description: "Track mods you use for supported games." },
  { title: "Developer & publisher pages", description: "Browse games by developer or publisher." },
  { title: "Year in review", description: "An annual recap of your gaming stats and highlights.", tag: "New" },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Tag({ label }: { label: string }) {
  const colors =
    label === "New"
      ? "bg-hs-green/10 text-hs-green border-hs-green/20"
      : "bg-amber-500/10 text-amber-400 border-amber-500/20"

  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors}`}
    >
      {label}
    </span>
  )
}

function RoadmapCard({
  item,
  variant,
}: {
  item: RoadmapItem
  variant: "completed" | "in-progress" | "planned"
}) {
  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
      <div className="flex items-start gap-3">
        {/* Indicator */}
        <div className="mt-0.5 flex-shrink-0">
          {variant === "completed" && (
            <CheckCircle2 className="h-4 w-4 text-hs-green" />
          )}
          {variant === "in-progress" && (
            <Clock className="h-4 w-4 text-amber-400" />
          )}
          {variant === "planned" && (
            <Compass className="h-4 w-4 text-zinc-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-100">
              {item.title}
            </h3>
            {item.tag && <Tag label={item.tag} />}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Column                                                             */
/* ------------------------------------------------------------------ */

function RoadmapColumn({
  title,
  count,
  variant,
  items,
  icon,
}: {
  title: string
  count: number
  variant: "completed" | "in-progress" | "planned"
  items: RoadmapItem[]
  icon: React.ReactNode
}) {
  const accentBar =
    variant === "completed"
      ? "bg-hs-green"
      : variant === "in-progress"
        ? "bg-amber-400"
        : "bg-zinc-600"

  return (
    <div className="flex flex-col">
      {/* Column header */}
      <div className="mb-4">
        <div className={`mb-3 h-1 w-full rounded-full ${accentBar}`} />
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
            {title}
          </h2>
          <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <RoadmapCard key={item.title} item={item} variant={variant} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">
          Roadmap
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          What we&rsquo;re building and what&rsquo;s coming next
        </p>
      </div>

      {/* Columns */}
      <div className="grid gap-8 md:grid-cols-3">
        <RoadmapColumn
          title="Completed"
          count={completed.length}
          variant="completed"
          items={completed}
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-hs-green" />}
        />
        <RoadmapColumn
          title="In Progress"
          count={inProgress.length}
          variant="in-progress"
          items={inProgress}
          icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
        />
        <RoadmapColumn
          title="Planned"
          count={planned.length}
          variant="planned"
          items={planned}
          icon={<Compass className="h-3.5 w-3.5 text-zinc-500" />}
        />
      </div>
    </div>
  )
}

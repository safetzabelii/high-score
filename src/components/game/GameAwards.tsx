import { Trophy } from "lucide-react"
import { getGameAwards, type GameAward } from "@/lib/awards"

interface GameAwardsProps {
  gameId: number
}

export function GameAwards({ gameId }: GameAwardsProps) {
  const awards = getGameAwards(gameId)
  if (awards.length === 0) return null

  // Group awards by event+year
  const grouped = new Map<string, GameAward[]>()
  for (const award of awards) {
    const key = `${award.event} ${award.year}`
    const list = grouped.get(key) ?? []
    list.push(award)
    grouped.set(key, list)
  }

  return (
    <div className="mt-6">
      <h3 className="section-heading mb-3">Awards</h3>
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([eventKey, eventAwards]) => (
          <div
            key={eventKey}
            className="rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-3.5 py-2.5"
          >
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
              {eventAwards[0].event} &middot; {eventAwards[0].year}
            </p>
            <div className="space-y-1">
              {eventAwards.map((award, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-[13px] text-zinc-200">
                    {award.award}
                  </span>
                  {award.category && (
                    <span className="text-[11px] text-zinc-500">
                      ({award.category})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

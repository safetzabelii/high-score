import Link from "next/link"

interface SectionHeadingProps {
  title: string
  moreHref?: string
  moreLabel?: string
}

export function SectionHeading({ title, moreHref, moreLabel = "MORE" }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/60">
      <h2 className="section-heading">{title}</h2>
      {moreHref && (
        <Link
          href={moreHref}
          className="text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {moreLabel}
        </Link>
      )}
    </div>
  )
}

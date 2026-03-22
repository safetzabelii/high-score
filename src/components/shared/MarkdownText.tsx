import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

interface MarkdownTextProps {
  children: string
  className?: string
  /** Truncate with line-clamp — pass the number of lines */
  clamp?: number
}

export function MarkdownText({ children, className, clamp }: MarkdownTextProps) {
  return (
    <div
      className={cn(
        "prose-sm prose-invert max-w-none",
        // Base typography
        "prose-p:my-1 prose-p:leading-relaxed",
        "prose-strong:text-zinc-200 prose-em:text-zinc-300",
        "prose-headings:text-zinc-200 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
        "prose-h1:text-base prose-h2:text-sm prose-h3:text-sm",
        // Lists
        "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        // Links
        "prose-a:text-hs-green prose-a:no-underline hover:prose-a:underline",
        // Code
        "prose-code:text-[12px] prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-zinc-300",
        // Blockquotes
        "prose-blockquote:border-l-2 prose-blockquote:border-zinc-700 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-zinc-500",
        // Line clamp
        clamp && `line-clamp-${clamp}`,
        className
      )}
    >
      <ReactMarkdown
        components={{
          // Prevent rendering images (security + layout)
          img: () => null,
          // Open links in new tab
          a: ({ children, href, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Share2, Link as LinkIcon, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ShareButtonProps {
  url: string
  title: string
}

export function ShareButton({ url, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url}`
    : url

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`,
      "_blank"
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-zinc-800 bg-zinc-950 text-zinc-50"
      >
        <DropdownMenuItem onClick={copyLink} className="cursor-pointer">
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-400" />
          ) : (
            <LinkIcon className="mr-2 h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToX} className="cursor-pointer">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

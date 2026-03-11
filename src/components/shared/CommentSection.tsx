"use client"

import { useState, useEffect, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { MessageCircle, User as UserIcon, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { createNotification } from "@/lib/notifications"

interface Comment {
  id: string
  text: string
  created_at: string
  user_id: string
  users: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

interface CommentSectionProps {
  logId: string
  logOwnerId: string
  currentUserId: string | null
  initialCount: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function CommentSection({
  logId,
  logOwnerId,
  currentUserId,
  initialCount,
}: CommentSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState("")
  const [submitting, startSubmit] = useTransition()
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    if (!expanded) return

    async function fetchComments() {
      setLoading(true)
      const { data } = await (supabase
        .from("comments")
        .select("*, users(username, display_name, avatar_url)")
        .eq("log_id", logId)
        .order("created_at", { ascending: true }) as any)
      setComments((data ?? []) as Comment[])
      setLoading(false)
    }

    fetchComments()
  }, [expanded, logId])

  function handleSubmit() {
    if (!text.trim() || !currentUserId) return

    const commentText = text.trim()
    setText("")

    startSubmit(async () => {
      try {
        const { data, error } = await ((supabase
          .from("comments") as any)
          .insert({ log_id: logId, user_id: currentUserId, text: commentText })
          .select("*, users(username, display_name, avatar_url)")
          .single())

        if (error) throw error

        setComments((prev) => [...prev, data as Comment])
        setCount((c) => c + 1)

        createNotification({
          userId: logOwnerId,
          actorId: currentUserId,
          type: "comment",
          logId,
        })
      } catch (err: any) {
        setText(commentText)
        toast.error(err.message ?? "Failed to post comment")
      }
    })
  }

  async function handleDelete(commentId: string) {
    const prev = comments
    setComments((c) => c.filter((x) => x.id !== commentId))
    setCount((c) => c - 1)

    const { error } = await supabase.from("comments").delete().eq("id", commentId)
    if (error) {
      setComments(prev)
      setCount((c) => c + 1)
      toast.error("Failed to delete comment")
    }
  }

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <MessageCircle className={`h-3.5 w-3.5 ${expanded ? "text-hs-green" : ""}`} />
        {count > 0 && <span className="tabular-nums">{count}</span>}
        {expanded ? (
          <ChevronUp className="h-3 w-3 ml-0.5" />
        ) : count > 0 ? (
          <ChevronDown className="h-3 w-3 ml-0.5" />
        ) : null}
      </button>

      {/* Expanded — Letterboxd-style comment list */}
      {expanded && (
        <div className="mt-3">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-4 text-center border-t border-zinc-800/50">
              <p className="text-xs text-zinc-600">
                No comments yet. Be the first to reply.
              </p>
            </div>
          ) : (
            <div>
              {comments.map((c) => {
                const name = c.users.display_name || c.users.username
                return (
                  <div
                    key={c.id}
                    className="flex gap-0 border-t border-zinc-800/50 py-3 group"
                  >
                    {/* Avatar */}
                    <Link
                      href={`/profile/${c.users.username}`}
                      className="flex-shrink-0 mr-3"
                    >
                      <div className="relative h-7 w-7 overflow-hidden rounded-full bg-zinc-800">
                        {c.users.avatar_url ? (
                          <Image
                            src={c.users.avatar_url}
                            alt={name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserIcon className="h-3 w-3 text-zinc-600" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Name + timestamp column — fixed width like Letterboxd */}
                    <div className="w-28 sm:w-32 flex-shrink-0 mr-3">
                      <Link
                        href={`/profile/${c.users.username}`}
                        className="text-[13px] font-semibold text-zinc-300 hover:text-zinc-100 transition-colors leading-tight block truncate"
                      >
                        {name}
                      </Link>
                      <span className="text-[11px] text-zinc-600 tabular-nums">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>

                    {/* Comment text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line">
                        {c.text}
                      </p>
                    </div>

                    {/* Delete button (own comments only) */}
                    {c.user_id === currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all rounded self-start"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Reply input — Letterboxd style: textarea + POST button */}
          {currentUserId ? (
            <div className="border-t border-zinc-800/50 pt-3 mt-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="Reply..."
                maxLength={500}
                rows={2}
                className="w-full resize-none rounded-md border border-zinc-700/50 bg-zinc-800/30 px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-hs-green/30 focus:outline-none focus:ring-1 focus:ring-hs-green/15 transition-all"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!text.trim() || submitting}
                  className="rounded-md bg-hs-green-button px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-hs-green-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Post"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-zinc-800/50 pt-3 text-center">
              <p className="text-xs text-zinc-600">
                <Link href="/login" className="text-hs-blue hover:text-hs-blue/80 font-medium">
                  Sign in
                </Link>{" "}
                to reply.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/service'
import type { ListRow, ListItemRow, UserRow, GameRow } from '@/types/database'

export const runtime = 'nodejs'
export const alt = 'List details'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const ct = res.headers.get('content-type') || 'image/jpeg'
    return `data:${ct};base64,${base64}`
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { data: list } = await supabase
    .from('lists')
    .select('*, users(*)')
    .eq('id', id)
    .single()

  if (!list || !(list as ListRow).is_public) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 40 }}>
        {!list ? 'List not found' : 'This list is private'}
      </div>,
      { ...size }
    )
  }

  const typedList = list as ListRow & { users: UserRow }

  const { data: items } = await supabase
    .from('list_items')
    .select('*, games(*)')
    .eq('list_id', id)
    .order('position', { ascending: true })
    .limit(8)

  const gameItems = (items ?? []) as (ListItemRow & { games: GameRow })[]

  const { count: totalGames } = await supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', id)

  // Fetch up to 8 covers
  const coverUrls = gameItems
    .filter(item => !!item.games?.cover_url)
    .map(item => item.games.cover_url!.replace(/t_[a-z0-9_]+/, 't_cover_big'))
    .slice(0, 8)

  const coverDataUris = await Promise.all(coverUrls.map(fetchImageAsBase64))
  const covers = coverDataUris.filter((uri): uri is string => uri !== null)

  const titleSize = typedList.title.length > 28 ? 42 : typedList.title.length > 16 ? 52 : 64

  // Grid: 4 columns x 2 rows, each cell is 300x315
  // Cover takes full cell with slight gap
  const cellW = 300
  const cellH = 315

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#09090b',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Game cover grid as background */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '1200px',
          height: '630px',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {covers.map((uri, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              width: `${cellW}px`,
              height: `${cellH}px`,
              padding: '4px',
            }}
          >
            <img
              src={uri}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
          </div>
        ))}
        {/* Fill empty cells with dark placeholders */}
        {Array.from({ length: Math.max(0, 8 - covers.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              display: 'flex',
              width: `${cellW}px`,
              height: `${cellH}px`,
              padding: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                background: '#18181b',
                borderRadius: '8px',
              }}
            />
          </div>
        ))}
      </div>

      {/* Dark overlay to make text readable */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.65)',
        }}
      />

      {/* Centered text content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
          padding: '40px 80px',
          gap: '20px',
        }}
      >
        {/* List badge */}
        <div
          style={{
            display: 'flex',
            padding: '8px 24px',
            borderRadius: '8px',
            background: 'rgba(255,0,85,0.2)',
            border: '2px solid rgba(255,0,85,0.5)',
            fontSize: 18,
            fontWeight: 800,
            color: '#ff0055',
            letterSpacing: '0.15em',
          }}
        >
          LIST
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: titleSize,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          {typedList.title}
        </div>

        {/* Description */}
        {typedList.description && (
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#d4d4d8',
              lineHeight: 1.4,
              textAlign: 'center',
              justifyContent: 'center',
              maxWidth: '700px',
            }}
          >
            {typedList.description.length > 90
              ? typedList.description.slice(0, 90) + '...'
              : typedList.description}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: 38, fontWeight: 800, color: '#ffffff' }}>{totalGames ?? 0}</span>
            <span style={{ fontSize: 22, color: '#a1a1aa', fontWeight: 500 }}>game{(totalGames ?? 0) !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', width: '2px', height: '32px', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: 22, color: '#a1a1aa' }}>by</span>
            <span style={{ fontSize: 24, color: '#ffffff', fontWeight: 700 }}>{typedList.users.username}</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '52px',
          background: 'rgba(0,0,0,0.7)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 64px',
        }}
      >
        <span style={{ color: '#ff0055', fontSize: 20, fontWeight: 800, letterSpacing: '0.12em' }}>HIGH-SCORE</span>
        <span style={{ color: '#52525b', fontSize: 16 }}>Track your games. Share your taste.</span>
      </div>
    </div>,
    { ...size }
  )
}

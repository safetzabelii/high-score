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

  const coverUrls = gameItems
    .filter(item => !!item.games?.cover_url)
    .map(item => item.games.cover_url!.replace(/t_[a-z0-9_]+/, 't_cover_big'))
    .slice(0, 8)

  const coverDataUris = await Promise.all(coverUrls.map(fetchImageAsBase64))
  const covers = coverDataUris.filter((uri): uri is string => uri !== null)

  const titleSize = typedList.title.length > 28 ? 40 : typedList.title.length > 16 ? 50 : 60
  const hasMore = (totalGames ?? 0) > covers.length

  // Grid config: 2 rows always, columns adapt to count
  const cols = covers.length <= 2 ? 1 : covers.length <= 4 ? 2 : covers.length <= 6 ? 3 : 4
  const rows = 2
  const gap = 10
  const gridPadY = 48
  const gridPadX = 48
  const availH = 630 - gridPadY * 2 - 48 // minus bottom bar
  const coverH = Math.floor((availH - gap) / rows)
  const coverW = Math.floor(coverH * 0.72)
  const gridWidth = cols * coverW + (cols - 1) * gap + gridPadX * 2

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#0a0a0b',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left side — cover grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: `${gridWidth}px`,
          gap: `${gap}px`,
          padding: `${gridPadY}px ${gridPadX}px`,
          alignContent: 'center',
          flexShrink: 0,
        }}
      >
        {covers.map((uri, i) => (
          <img
            key={i}
            src={uri}
            width={coverW}
            height={coverH}
            style={{
              objectFit: 'cover',
              borderRadius: '12px',
            }}
          />
        ))}
      </div>

      {/* Right side — info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          padding: '48px 56px 48px 24px',
          gap: '18px',
          minWidth: 0,
        }}
      >
        {/* List badge */}
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              padding: '6px 20px',
              borderRadius: '8px',
              background: 'rgba(255,0,85,0.15)',
              border: '2px solid rgba(255,0,85,0.4)',
              fontSize: 16,
              fontWeight: 800,
              color: '#ff0055',
              letterSpacing: '0.15em',
            }}
          >
            LIST
          </div>
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
          }}
        >
          {typedList.title}
        </div>

        {/* Description */}
        {typedList.description && (
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              color: '#a1a1aa',
              lineHeight: 1.4,
            }}
          >
            {typedList.description.length > 80
              ? typedList.description.slice(0, 80) + '...'
              : typedList.description}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: '#ffffff' }}>{totalGames ?? 0}</span>
          <span style={{ fontSize: 20, color: '#71717a', fontWeight: 500 }}>game{(totalGames ?? 0) !== 1 ? 's' : ''}</span>
        </div>

        {/* By user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: 20, color: '#71717a' }}>by</span>
          <span style={{ fontSize: 22, color: '#ffffff', fontWeight: 700 }}>{typedList.users.username}</span>
        </div>

        {/* Three dots if more games */}
        {hasMore && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', background: '#52525b' }} />
            <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', background: '#3f3f46' }} />
            <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', background: '#27272a' }} />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '48px',
          background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        <span style={{ color: '#ff0055', fontSize: 18, fontWeight: 800, letterSpacing: '0.12em' }}>HIGH-SCORE</span>
        <span style={{ color: '#3f3f46', fontSize: 14 }}>Track your games. Share your taste.</span>
      </div>
    </div>,
    { ...size }
  )
}

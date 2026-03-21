import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
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
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: list } = await (supabase
    .from('lists')
    .select('*, users(*)')
    .eq('id', id)
    .single() as any)

  if (!list || !(list as ListRow).is_public) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 32 }}>
        {!list ? 'List not found' : 'This list is private'}
      </div>,
      { ...size }
    )
  }

  const typedList = list as ListRow & { users: UserRow }

  const { data: items } = await (supabase
    .from('list_items')
    .select('*, games(*)')
    .eq('list_id', id)
    .order('position', { ascending: true })
    .limit(6) as any)

  const gameItems = (items ?? []) as (ListItemRow & { games: GameRow })[]

  const { count: totalGames } = await (supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', id) as any)

  // Pre-fetch cover images as base64 data URIs (Satori can't always fetch external URLs on Vercel)
  const coverUrls = gameItems
    .filter(item => !!item.games?.cover_url)
    .map(item => item.games.cover_url!)
    .slice(0, 4)

  const coverDataUris = await Promise.all(coverUrls.map(fetchImageAsBase64))
  const covers = coverDataUris.filter((uri): uri is string => uri !== null)

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#09090b',
        padding: '48px',
      }}
    >
      {/* Left side — game covers grid */}
      {covers.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: '340px',
            gap: '8px',
            alignContent: 'center',
            flexShrink: 0,
          }}
        >
          {covers.map((dataUri, i) => (
            <img
              key={i}
              src={dataUri}
              width={covers.length <= 1 ? 200 : 162}
              height={covers.length <= 1 ? 280 : 230}
              style={{
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Right side — info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          paddingLeft: covers.length > 0 ? '40px' : '0',
          gap: '16px',
        }}
      >
        {/* List badge */}
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              padding: '4px 14px',
              borderRadius: '6px',
              background: 'rgba(255,0,85,0.15)',
              border: '1px solid rgba(255,0,85,0.3)',
              fontSize: 14,
              fontWeight: 700,
              color: '#ff0055',
              letterSpacing: '0.1em',
            }}
          >
            LIST
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: typedList.title.length > 35 ? 38 : 48,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.15,
          }}
        >
          {typedList.title}
        </div>

        {/* Description */}
        {typedList.description && (
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: '#a1a1aa',
              lineHeight: 1.4,
            }}
          >
            {typedList.description.length > 120
              ? typedList.description.slice(0, 120) + '...'
              : typedList.description}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>{totalGames ?? 0}</span>
            <span style={{ fontSize: 16, color: '#71717a' }}>game{(totalGames ?? 0) !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 16, color: '#a1a1aa' }}>by {typedList.users.username}</span>
          </div>
        </div>

        {/* Game names */}
        {gameItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {gameItems.slice(0, 4).map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  fontSize: 15,
                  color: '#71717a',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#52525b', fontWeight: 600 }}>{i + 1}.</span>
                <span>{item.games?.title ?? 'Unknown'}</span>
              </div>
            ))}
            {(totalGames ?? 0) > 4 && (
              <div style={{ display: 'flex', fontSize: 14, color: '#52525b', paddingLeft: '20px' }}>
                +{(totalGames ?? 0) - 4} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom branding */}
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
        <span style={{ color: '#ff0055', fontSize: 16, fontWeight: 800, letterSpacing: '0.1em' }}>HIGH-SCORE</span>
        <span style={{ color: '#52525b', fontSize: 14 }}>Track your games. Share your taste.</span>
      </div>
    </div>,
    { ...size }
  )
}

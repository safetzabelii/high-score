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
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${base64}`
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
    .limit(6)

  const gameItems = (items ?? []) as (ListItemRow & { games: GameRow })[]

  const { count: totalGames } = await supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', id)

  // Pre-fetch cover images as base64
  const coverUrls = gameItems
    .filter(item => !!item.games?.cover_url)
    .map(item => item.games.cover_url!.replace(/t_[a-z0-9_]+/, 't_cover_big'))
    .slice(0, 5)

  const coverDataUris = await Promise.all(coverUrls.map(fetchImageAsBase64))
  const covers = coverDataUris.filter((uri): uri is string => uri !== null)

  const titleSize = typedList.title.length > 30 ? 44 : typedList.title.length > 18 ? 56 : 64

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
      {/* Subtle gradient background */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '56px 64px',
          position: 'relative',
          gap: '48px',
          alignItems: 'center',
        }}
      >
        {/* Left — stacked covers */}
        {covers.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: covers.length >= 3 ? '380px' : '260px',
              height: '420px',
              position: 'relative',
            }}
          >
            {covers.length === 1 ? (
              <img
                src={covers[0]}
                style={{
                  width: '240px',
                  height: '340px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '2px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                }}
              />
            ) : covers.length === 2 ? (
              <>
                <img
                  src={covers[0]}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20px',
                    width: '200px',
                    height: '285px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                  }}
                />
                <img
                  src={covers[1]}
                  style={{
                    position: 'absolute',
                    left: '80px',
                    top: '60px',
                    width: '200px',
                    height: '285px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                  }}
                />
              </>
            ) : (
              // 3+ covers — fan layout
              <>
                {covers.slice(0, Math.min(covers.length, 4)).map((uri, i) => {
                  const offsets = [
                    { left: 0, top: 40, rotate: '-6deg', z: 4 },
                    { left: 90, top: 10, rotate: '-2deg', z: 3 },
                    { left: 180, top: 30, rotate: '3deg', z: 2 },
                    { left: 130, top: 70, rotate: '6deg', z: 1 },
                  ]
                  const o = offsets[i]
                  return (
                    <img
                      key={i}
                      src={uri}
                      style={{
                        position: 'absolute',
                        left: `${o.left}px`,
                        top: `${o.top}px`,
                        width: '180px',
                        height: '255px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        border: '2px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 15px 50px rgba(0,0,0,0.8)',
                        transform: `rotate(${o.rotate})`,
                      }}
                    />
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* Right side — info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            gap: '18px',
            minWidth: 0,
          }}
        >
          {/* List badge */}
          <div style={{ display: 'flex' }}>
            <div
              style={{
                display: 'flex',
                padding: '6px 18px',
                borderRadius: '8px',
                background: 'rgba(255,0,85,0.15)',
                border: '1.5px solid rgba(255,0,85,0.35)',
                fontSize: 18,
                fontWeight: 800,
                color: '#ff0055',
                letterSpacing: '0.12em',
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
                fontSize: 22,
                color: '#a1a1aa',
                lineHeight: 1.4,
              }}
            >
              {typedList.description.length > 100
                ? typedList.description.slice(0, 100) + '...'
                : typedList.description}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: '#ffffff' }}>{totalGames ?? 0}</span>
              <span style={{ fontSize: 22, color: '#71717a', fontWeight: 500 }}>game{(totalGames ?? 0) !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', width: '2px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 22, color: '#a1a1aa' }}>by</span>
              <span style={{ fontSize: 22, color: '#ffffff', fontWeight: 600 }}>{typedList.users.username}</span>
            </div>
          </div>

          {/* Game names */}
          {gameItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {gameItems.slice(0, 4).map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    color: '#a1a1aa',
                    gap: '10px',
                  }}
                >
                  <span style={{ color: '#52525b', fontWeight: 700, minWidth: '28px' }}>{i + 1}.</span>
                  <span>{item.games?.title ?? 'Unknown'}</span>
                </div>
              ))}
              {(totalGames ?? 0) > 4 && (
                <div style={{ display: 'flex', fontSize: 18, color: '#52525b', paddingLeft: '38px', fontWeight: 500 }}>
                  +{(totalGames ?? 0) - 4} more
                </div>
              )}
            </div>
          )}
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
          height: '56px',
          background: 'rgba(0,0,0,0.6)',
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

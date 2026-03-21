import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import type { ListRow, ListItemRow, UserRow, GameRow } from '@/types/database'

export const runtime = 'nodejs'
export const alt = 'List details'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: list } = await (supabase
    .from('lists')
    .select('*, users(*)')
    .eq('id', id)
    .single() as any)

  if (!list) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40 }}>
        List not found
      </div>,
      { ...size }
    )
  }

  const typedList = list as ListRow & { users: UserRow }

  // Don't generate OG for private lists
  if (!typedList.is_public) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 32 }}>
        This list is private
      </div>,
      { ...size }
    )
  }

  const { data: items } = await (supabase
    .from('list_items')
    .select('*, games(*)')
    .eq('list_id', id)
    .order('position', { ascending: true })
    .limit(8) as any)

  const gameItems = (items ?? []) as (ListItemRow & { games: GameRow })[]

  // Get total count
  const { count: totalGames } = await (supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', id) as any)

  const covers = gameItems
    .filter((item): item is typeof item & { games: GameRow & { cover_url: string } } => !!item.games?.cover_url)
    .map(item => item.games.cover_url)

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
      {/* Background — faded game covers grid */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          height: '100%',
          opacity: 0.08,
        }}
      >
        {covers.slice(0, 6).map((url, i) => (
          <img
            key={i}
            src={url}
            style={{
              width: `${100 / Math.min(covers.length, 6)}%`,
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '48px',
          position: 'relative',
          gap: '40px',
        }}
      >
        {/* Game covers stack */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            width: '320px',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {covers.slice(0, 5).map((url, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                position: 'absolute',
                left: `${i * 52}px`,
                top: '50%',
                transform: `translateY(-50%)`,
                width: '140px',
                height: '200px',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 5 - i,
              }}
            >
              <img
                src={url}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>

        {/* Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            gap: '16px',
            minWidth: 0,
          }}
        >
          {/* List label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                padding: '4px 12px',
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

          {/* Stats */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>{totalGames ?? 0}</span>
              <span style={{ fontSize: 16, color: '#71717a' }}>game{(totalGames ?? 0) !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#27272a',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {typedList.users.avatar_url ? (
                  <img src={typedList.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 14, color: '#a1a1aa' }}>{typedList.users.username?.[0]?.toUpperCase() ?? '?'}</span>
                )}
              </div>
              <span style={{ fontSize: 16, color: '#a1a1aa' }}>by {typedList.users.username}</span>
            </div>
          </div>

          {/* Game names preview */}
          {gameItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
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
                  <span style={{ color: '#52525b', fontWeight: 600, minWidth: '18px' }}>{i + 1}.</span>
                  <span>{item.games?.title ?? 'Unknown'}</span>
                </div>
              ))}
              {(totalGames ?? 0) > 4 && (
                <span style={{ fontSize: 14, color: '#52525b', marginLeft: '26px' }}>
                  +{(totalGames ?? 0) - 4} more
                </span>
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
    {
      ...size,
    }
  )
}

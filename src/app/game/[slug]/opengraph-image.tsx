/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from 'next/og'
import { getCachedGameBySlug } from '@/lib/igdb/fetch'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const alt = 'Game details'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = await getCachedGameBySlug(slug)
  if (!game) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40 }}>
        Game not found
      </div>,
      { ...size }
    )
  }

  // Fetch community stats (service client bypasses RLS for unauthenticated requests)
  const supabase = createServiceClient()

  let logCount: number | null = null
  let avgRating: number | null = null
  let ratingCount = 0

  try {
    const { count } = await (supabase
      .from('game_logs')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id) as any)
    logCount = count

    const { data: ratingLogs } = await (supabase
      .from('game_logs')
      .select('rating')
      .eq('game_id', game.id)
      .gt('rating', 0) as any)

    const ratings = (ratingLogs ?? []) as { rating: number }[]
    ratingCount = ratings.length
    if (ratings.length > 0) {
      avgRating = Math.round((ratings.reduce((s, l) => s + l.rating, 0) / ratings.length) * 10) / 10
    }
  } catch {
    // RLS may block reads without service role key — stats will be omitted
  }

  const coverUrl = game.cover_url
    ? game.cover_url.replace(/t_[a-z0-9_]+/, 't_cover_big')
    : null

  // Use a screenshot as background if available
  const bgUrl = game.screenshots?.[2] ?? game.screenshots?.[1] ?? game.screenshots?.[0] ?? null

  // Hearts for rating display (0-5 scale, rating is 0-10)
  const heartCount = avgRating ? Math.round(avgRating) / 2 : 0
  const fullHearts = Math.floor(heartCount)
  const hasHalf = heartCount - fullHearts >= 0.5

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
      {/* Background screenshot */}
      {bgUrl && (
        <img
          src={bgUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.7) 50%, rgba(9,9,11,0.9) 100%)',
        }}
      />

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
        {/* Cover art */}
        {coverUrl && (
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: '240px',
              height: '340px',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              marginTop: '20px',
            }}
          >
            <img
              src={coverUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            gap: '12px',
            minWidth: 0,
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: game.title.length > 30 ? 42 : 52,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {game.title}
          </div>

          {/* Year + Developer */}
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#a1a1aa',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {game.release_year && <span>{game.release_year}</span>}
            {game.release_year && game.developer && <span style={{ color: '#52525b' }}>·</span>}
            {game.developer && <span>{game.developer}</span>}
          </div>

          {/* Genres */}
          {game.genres.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {game.genres.slice(0, 3).map((genre) => (
                <div
                  key={genre}
                  style={{
                    display: 'flex',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: 16,
                    color: '#d4d4d8',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  {genre}
                </div>
              ))}
            </div>
          )}

          {/* Ratings row */}
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginTop: '16px' }}>
            {/* IGDB rating */}
            {game.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: game.rating >= 8 ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${game.rating >= 8 ? 'rgba(255,0,85,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    fontSize: 24,
                    fontWeight: 700,
                    color: game.rating >= 8 ? '#ff0055' : '#ffffff',
                  }}
                >
                  {game.rating}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: 14, color: '#71717a', fontWeight: 600, letterSpacing: '0.05em' }}>IGDB</span>
                  <span style={{ fontSize: 13, color: '#52525b' }}>SCORE</span>
                </div>
              </div>
            )}

            {/* Community rating hearts */}
            {avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="22" height="22" viewBox="0 0 24 24">
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={i < fullHearts ? '#ff0055' : (i === fullHearts && hasHalf ? '#ff0055' : '#3f3f46')}
                        opacity={i === fullHearts && hasHalf ? 0.5 : 1}
                      />
                    </svg>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: 18, color: '#ffffff', fontWeight: 600 }}>{avgRating}</span>
                  <span style={{ fontSize: 13, color: '#52525b' }}>{ratingCount} rating{ratingCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            {/* Log count */}
            {(logCount ?? 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>{logCount}</span>
                <span style={{ fontSize: 14, color: '#71717a' }}>log{logCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar - branding */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ff0055', fontSize: 16, fontWeight: 800, letterSpacing: '0.1em' }}>HIGH-SCORE</span>
        </div>
        <span style={{ color: '#52525b', fontSize: 14 }}>Track your games. Share your taste.</span>
      </div>
    </div>,
    {
      ...size,
    }
  )
}

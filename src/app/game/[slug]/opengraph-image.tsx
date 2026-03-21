/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from 'next/og'
import { getCachedGameBySlug } from '@/lib/igdb/fetch'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const alt = 'Game details'
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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = await getCachedGameBySlug(slug)
  if (!game) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 48 }}>
        Game not found
      </div>,
      { ...size }
    )
  }

  // Fetch community stats
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
    // Stats will be omitted
  }

  const coverUrl = game.cover_url
    ? game.cover_url.replace(/t_[a-z0-9_]+/, 't_cover_big')
    : null

  const bgUrl = game.screenshots?.[2] ?? game.screenshots?.[1] ?? game.screenshots?.[0] ?? null

  // Pre-fetch images as base64
  const [coverData, bgData] = await Promise.all([
    coverUrl ? fetchImageAsBase64(coverUrl) : null,
    bgUrl ? fetchImageAsBase64(bgUrl) : null,
  ])

  // Hearts for community rating
  const heartCount = avgRating ? Math.round(avgRating) / 2 : 0
  const fullHearts = Math.floor(heartCount)
  const hasHalf = heartCount - fullHearts >= 0.5

  const titleSize = game.title.length > 35 ? 52 : game.title.length > 22 ? 60 : 72

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
      {bgData && (
        <img
          src={bgData}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.2,
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
          background: 'linear-gradient(to right, rgba(9,9,11,0.97) 0%, rgba(9,9,11,0.85) 40%, rgba(9,9,11,0.6) 100%)',
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
        {/* Cover art */}
        {coverData && (
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              width: '280px',
              height: '400px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 80px rgba(0,0,0,0.9)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            <img
              src={coverData}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
            gap: '16px',
            minWidth: 0,
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: titleSize,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            {game.title}
          </div>

          {/* Year + Developer */}
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: '#a1a1aa',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {game.release_year && <span style={{ fontWeight: 600, color: '#d4d4d8' }}>{game.release_year}</span>}
            {game.release_year && game.developer && <span style={{ color: '#52525b' }}>·</span>}
            {game.developer && <span>{game.developer}</span>}
          </div>

          {/* Genres */}
          {game.genres.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
              {game.genres.slice(0, 3).map((genre) => (
                <div
                  key={genre}
                  style={{
                    display: 'flex',
                    padding: '6px 18px',
                    borderRadius: '24px',
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    fontSize: 20,
                    color: '#d4d4d8',
                    background: 'rgba(255,255,255,0.06)',
                    fontWeight: 500,
                  }}
                >
                  {genre}
                </div>
              ))}
            </div>
          )}

          {/* Ratings row */}
          <div style={{ display: 'flex', gap: '36px', alignItems: 'center', marginTop: '20px' }}>
            {/* IGDB rating */}
            {game.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '68px',
                    height: '68px',
                    borderRadius: '16px',
                    background: game.rating >= 8 ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${game.rating >= 8 ? 'rgba(255,0,85,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    fontSize: 32,
                    fontWeight: 800,
                    color: game.rating >= 8 ? '#ff0055' : '#ffffff',
                  }}
                >
                  {game.rating}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: 18, color: '#71717a', fontWeight: 700, letterSpacing: '0.08em' }}>IGDB</span>
                  <span style={{ fontSize: 16, color: '#52525b' }}>SCORE</span>
                </div>
              </div>
            )}

            {/* Community rating hearts */}
            {avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="28" height="28" viewBox="0 0 24 24">
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={i < fullHearts ? '#ff0055' : (i === fullHearts && hasHalf ? '#ff0055' : '#3f3f46')}
                        opacity={i === fullHearts && hasHalf ? 0.5 : 1}
                      />
                    </svg>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: 24, color: '#ffffff', fontWeight: 700 }}>{avgRating}</span>
                  <span style={{ fontSize: 16, color: '#52525b' }}>{ratingCount} rating{ratingCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            {/* Log count */}
            {(logCount ?? 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>{logCount}</span>
                <span style={{ fontSize: 18, color: '#71717a', fontWeight: 500 }}>log{logCount !== 1 ? 's' : ''}</span>
              </div>
            )}
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

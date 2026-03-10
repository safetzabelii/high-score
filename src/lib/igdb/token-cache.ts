
interface TokenCache {
  accessToken: string
  expiresAt: number   // unix ms
}

let cache: TokenCache | null = null

export async function getIgdbToken(): Promise<string> {
  const now = Date.now()

  if (cache && cache.expiresAt - now > 24 * 60 * 60 * 1000) {
    return cache.accessToken
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${process.env.TWITCH_CLIENT_ID}` +
    `&client_secret=${process.env.TWITCH_CLIENT_SECRET}` +
    `&grant_type=client_credentials`,
    { method: 'POST' }
  )

  if (!res.ok) {
    throw new Error(`Twitch token fetch failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }

  cache = {
    accessToken: data.access_token,
    expiresAt:   now + data.expires_in * 1000,
  }

  return cache.accessToken
}
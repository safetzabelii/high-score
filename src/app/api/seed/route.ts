import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getPopularThisWeek, shapeGame } from "@/lib/igdb/fetch"

// POST /api/seed — populate the DB with fake users, reviews, lists, etc.
// Only works in development
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 })
  }

  const db = createServiceClient()
  const results: string[] = []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    // ─── 1. Fetch games from IGDB to seed with ───
    results.push("Fetching games from IGDB...")
    let igdbGames: any[] = []
    try {
      const raw = await getPopularThisWeek(40)
      igdbGames = raw.map(shapeGame)
    } catch (e) {
      results.push("IGDB fetch failed, using existing games only")
    }

    // Also get existing games from DB
    const { data: existingGames } = await (db.from("games").select("*").limit(200) as any)
    const allGameIds = new Set<number>()

    // Upsert IGDB games
    for (const g of igdbGames) {
      await (db.from("games") as any).upsert({
        id: g.id,
        title: g.title,
        slug: g.slug,
        cover_url: g.cover_url,
        release_year: g.release_year,
      }, { onConflict: "id" })
      allGameIds.add(g.id)
    }

    // Add existing games
    for (const g of (existingGames ?? [])) {
      allGameIds.add(g.id)
    }

    const gameIds = Array.from(allGameIds)
    const allGames = [...(existingGames ?? []), ...igdbGames]
    const gameMap = new Map(allGames.map((g: any) => [g.id, g]))
    results.push(`${gameIds.length} games available`)

    // ─── 2. Create fake users ───
    const fakeUsers = [
      { username: "nightowl", display_name: "NightOwl", bio: "nocturnal gamer. souls enthusiast." },
      { username: "pixeldust", display_name: "PixelDust", bio: "retro games + indie gems" },
      { username: "stormbreaker", display_name: "StormBreaker", bio: "competitive FPS player" },
      { username: "lunarglow", display_name: "LunarGlow", bio: "RPGs and visual novels are my comfort zone" },
      { username: "ironfist99", display_name: "IronFist99", bio: "fighting games since '98" },
      { username: "cloudrunner", display_name: "CloudRunner", bio: "platformers and roguelikes" },
      { username: "neonviper", display_name: "NeonViper", bio: "cyberpunk aesthetic enjoyer" },
      { username: "frostbyte", display_name: "FrostByte", bio: "strategy and simulation nerd" },
      { username: "emberfall", display_name: "EmberFall", bio: "story-driven games only" },
      { username: "zenithx", display_name: "ZenithX", bio: "speedrunner | completionist" },
      { username: "shadowmeld", display_name: "ShadowMeld", bio: "stealth games are art" },
      { username: "aurorablade", display_name: "AuroraBlade", bio: "JRPGs, MMOs, and gacha pain" },
      { username: "voltedge", display_name: "VoltEdge", bio: "anything with a good soundtrack" },
      { username: "crimsonhaze", display_name: "CrimsonHaze", bio: "horror and survival games" },
      { username: "driftking", display_name: "DriftKing", bio: "racing games and open worlds" },
    ]

    const createdUserIds: string[] = []

    for (const u of fakeUsers) {
      // Check if user already exists
      const { data: existing } = await (db.from("users").select("id").eq("username", u.username).single() as any)
      if (existing) {
        createdUserIds.push(existing.id)
        continue
      }

      // Create auth user via admin API
      const email = `${u.username}@fakeseed.local`
      const password = `SeedPass_${u.username}_2026!`

      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { username: u.username },
        }),
      })

      if (!authRes.ok) {
        const err = await authRes.text()
        // If user already exists in auth, try to find them
        if (err.includes("already been registered")) {
          const { data: foundUser } = await (db.from("users").select("id").eq("username", u.username).single() as any)
          if (foundUser) createdUserIds.push(foundUser.id)
          continue
        }
        results.push(`Failed to create auth user ${u.username}: ${err}`)
        continue
      }

      const authData = await authRes.json()
      const userId = authData.id

      // Insert into users table
      await (db.from("users") as any).upsert({
        id: userId,
        username: u.username,
        display_name: u.display_name,
        bio: u.bio,
        avatar_url: null,
        banner_url: null,
        banner_y: 50,
      }, { onConflict: "id" })

      createdUserIds.push(userId)
    }
    results.push(`${createdUserIds.length} users ready`)

    // ─── 3. Generate game logs (reviews + ratings) ───
    const statuses = ["played", "played", "played", "completed", "playing", "backlog", "wishlist", "abandoned"] as const
    const reviewTexts = [
      "Absolutely incredible experience. One of the best games I've ever played.",
      "Solid gameplay but the story fell flat for me.",
      "Great mechanics, terrible pacing. Still worth a play.",
      "This game changed how I think about the genre.",
      "Overhyped but still enjoyable. Good for a weekend playthrough.",
      "Masterpiece. Every detail is polished to perfection.",
      "Fun with friends, boring solo. Classic multiplayer game.",
      "The soundtrack alone makes this worth playing.",
      "Started slow but the ending blew my mind.",
      "Not for everyone but if you like this genre, it's a must.",
      "Decent but forgettable. Nothing new to offer.",
      "A hidden gem that deserves way more attention.",
      "Pure nostalgia trip. Loved every second.",
      "Buggy at launch but patches have made it great.",
      "Short but sweet. Quality over quantity.",
      "The world-building in this game is unmatched.",
      "Gameplay loop gets repetitive after 20 hours.",
      "One of those games that stays with you long after you finish.",
      "Tried so hard to like this but it just didn't click.",
      "Perfect comfort game for late night sessions.",
      null, null, null, null, null, // Many logs without reviews
      null, null, null, null, null,
    ]

    let logsCreated = 0
    for (const userId of createdUserIds) {
      // Each user logs 15-35 games
      const numLogs = 15 + Math.floor(Math.random() * 20)
      const shuffledGames = [...gameIds].sort(() => Math.random() - 0.5).slice(0, numLogs)

      for (let i = 0; i < shuffledGames.length; i++) {
        const gameId = shuffledGames[i]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const hasRating = status !== "wishlist" && status !== "backlog" && Math.random() > 0.2
        const rating = hasRating ? (Math.floor(Math.random() * 10) + 1) * 0.5 : null
        const review = Math.random() > 0.6 ? reviewTexts[Math.floor(Math.random() * reviewTexts.length)] : null
        const daysAgo = Math.floor(Math.random() * 90)
        const logDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0]

        const { error } = await (db.from("game_logs") as any).upsert({
          user_id: userId,
          game_id: gameId,
          status,
          rating,
          review_text: review,
          contains_spoilers: Math.random() > 0.9,
          platforms: [["PC", "PlayStation", "Xbox", "Switch"][Math.floor(Math.random() * 4)]],
          playtime_hours: Math.random() > 0.5 ? Math.floor(Math.random() * 200) + 1 : null,
          playthrough_number: 1,
          logged_date: logDate,
        }, { onConflict: "user_id,game_id,playthrough_number" })

        if (!error) logsCreated++
      }
    }
    results.push(`${logsCreated} game logs created`)

    // ─── 4. Create follows (everyone follows some people) ───
    // Get real users too
    const { data: realUsers } = await (db.from("users").select("id").limit(50) as any)
    const allUserIds = (realUsers ?? []).map((u: any) => u.id)

    let followsCreated = 0
    for (const userId of createdUserIds) {
      const othersToFollow = allUserIds
        .filter((id: string) => id !== userId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 + Math.floor(Math.random() * 8))

      for (const targetId of othersToFollow) {
        const { error } = await (db.from("follows") as any).upsert({
          follower_id: userId,
          following_id: targetId,
        }, { onConflict: "follower_id,following_id" })
        if (!error) followsCreated++
      }
    }
    results.push(`${followsCreated} follows created`)

    // ─── 5. Create likes on logs ───
    const { data: allLogs } = await (db.from("game_logs")
      .select("id, user_id")
      .not("review_text", "is", null)
      .limit(200) as any)

    let likesCreated = 0
    for (const userId of createdUserIds) {
      const logsToLike = (allLogs ?? [])
        .filter((l: any) => l.user_id !== userId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 + Math.floor(Math.random() * 15))

      for (const log of logsToLike) {
        const { error } = await (db.from("likes") as any).upsert({
          user_id: userId,
          log_id: log.id,
        }, { onConflict: "user_id,log_id" })
        if (!error) likesCreated++
      }
    }
    results.push(`${likesCreated} likes created`)

    // ─── 6. Create comments ───
    const commentTexts = [
      "Couldn't agree more!",
      "Interesting take. I had a completely different experience.",
      "This is exactly how I felt about it.",
      "You should try the DLC, it's even better.",
      "Hard disagree on this one but respect your opinion.",
      "Adding this to my backlog right now.",
      "The multiplayer is where this game really shines.",
      "I rage-quit this game three times before finishing it lol",
      "Underrated game for sure.",
      "Your review convinced me to finally try this.",
      "Been waiting for someone to say this.",
      "The ending hit different after a second playthrough.",
      "Facts. This game doesn't get enough love.",
      "How long did it take you to beat it?",
      "Same. The soundtrack is incredible.",
    ]

    let commentsCreated = 0
    for (const userId of createdUserIds) {
      const logsToComment = (allLogs ?? [])
        .filter((l: any) => l.user_id !== userId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 6))

      for (const log of logsToComment) {
        const { error } = await (db.from("comments") as any).insert({
          user_id: userId,
          log_id: log.id,
          text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
        })
        if (!error) commentsCreated++
      }
    }
    results.push(`${commentsCreated} comments created`)

    // ─── 7. Create lists ───
    const listTemplates = [
      { title: "Top 10 Games of All Time", description: "My personal GOAT list" },
      { title: "Best Indie Games", description: "Small studios, big impact" },
      { title: "Games That Made Me Cry", description: "Emotional masterpieces" },
      { title: "Couch Co-op Essentials", description: "Best games to play with friends on the couch" },
      { title: "Underrated Gems", description: "Games that deserved more attention" },
      { title: "Best Soundtracks", description: "Games I play just for the music" },
      { title: "Comfort Games", description: "When you just want to relax" },
      { title: "Hardest Games I've Beaten", description: "Pain and glory" },
      { title: "Must-Play RPGs", description: "Essential role-playing experiences" },
      { title: "Best Horror Games", description: "Sleep is overrated anyway" },
      { title: "2025 GOTY Contenders", description: "The best games released this year" },
      { title: "Short But Sweet", description: "Finished in under 10 hours but unforgettable" },
    ]

    let listsCreated = 0
    for (const userId of createdUserIds) {
      const numLists = 1 + Math.floor(Math.random() * 3)
      const templates = [...listTemplates].sort(() => Math.random() - 0.5).slice(0, numLists)

      for (const tmpl of templates) {
        const { data: list, error } = await (db.from("lists") as any)
          .insert({
            user_id: userId,
            title: tmpl.title,
            description: tmpl.description,
            is_public: Math.random() > 0.15,
          })
          .select("id")
          .single()

        if (error || !list) continue
        listsCreated++

        // Add 5-12 random games to the list
        const listGames = [...gameIds].sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 8))
        const items = listGames.map((gid, i) => ({
          list_id: list.id,
          game_id: gid,
          position: i,
        }))

        await (db.from("list_items") as any).insert(items)
      }
    }
    results.push(`${listsCreated} lists created`)

    // ─── 8. Set favorite games for some users (via REST API to bypass RLS) ───
    let favsCreated = 0
    for (const userId of createdUserIds) {
      if (Math.random() > 0.4) {
        const favGames = [...gameIds].sort(() => Math.random() - 0.5).slice(0, 4)
        for (let i = 0; i < favGames.length; i++) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/favorite_games?on_conflict=user_id,game_id`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
                "apikey": serviceKey,
                "Prefer": "resolution=merge-duplicates",
              },
              body: JSON.stringify({
                user_id: userId,
                game_id: favGames[i],
                position: i,
              }),
            }
          )
          if (res.ok) favsCreated++
        }
      }
    }
    results.push(`${favsCreated} favorite games set`)

    return NextResponse.json({
      success: true,
      summary: results,
      users: createdUserIds.length,
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      summary: results,
    }, { status: 500 })
  }
}

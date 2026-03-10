// ============================================================
//  src/types/database.ts
//  Hand-written types matching 001_initial_schema.sql
//  For auto-generated types run:
//    npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
// ============================================================

export type GameStatus = 'played' | 'playing' | 'backlog' | 'abandoned'

// ── Raw table rows (what Supabase returns) ───────────────────

export interface UserRow {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface GameRow {
  id: number          // matches IGDB game ID
  title: string
  cover_url: string | null
  release_year: number | null
  slug: string
  created_at: string
}

export interface GameLogRow {
  id: string
  user_id: string
  game_id: number
  rating: number | null   // 0.5 – 5.0, half-star increments
  status: GameStatus
  review_text: string | null
  contains_spoilers: boolean
  platforms: string[]
  playtime_hours: number | null
  logged_date: string     // ISO date string "YYYY-MM-DD"
  created_at: string
}

export interface FollowRow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface LikeRow {
  id: string
  user_id: string
  log_id: string
  created_at: string
}

// ── View: feed_entries (joined row from the DB view) ─────────

export interface FeedEntry {
  // log fields
  id: string
  rating: number | null
  status: GameStatus
  review_text: string | null
  contains_spoilers: boolean
  platforms: string[]
  playtime_hours: number | null
  logged_date: string
  created_at: string
  like_count: number
  // user fields
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  // game fields
  game_id: number
  game_title: string
  cover_url: string | null
  release_year: number | null
  game_slug: string
}

// ── Insert / Update payloads ──────────────────────────────────

export type InsertGameLog = Omit<GameLogRow, 'id' | 'created_at'>
export type UpdateGameLog = Partial<Omit<GameLogRow, 'id' | 'user_id' | 'game_id' | 'created_at'>>

export type InsertGame    = Omit<GameRow, 'created_at'>
export type UpdateUser    = Partial<Pick<UserRow, 'display_name' | 'avatar_url' | 'bio'>>

// ── Supabase Database type map (for createClient<Database>()) ─
//  Extend this as you add tables.

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: Omit<UserRow, 'created_at'>
        Update: UpdateUser
      }
      games: {
        Row: GameRow
        Insert: InsertGame
        Update: Partial<InsertGame>
      }
      game_logs: {
        Row: GameLogRow
        Insert: InsertGameLog
        Update: UpdateGameLog
      }
      follows: {
        Row: FollowRow
        Insert: Omit<FollowRow, 'created_at'>
        Update: never
      }
      likes: {
        Row: LikeRow
        Insert: Omit<LikeRow, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: {
      feed_entries: {
        Row: FeedEntry
      }
    }
    Enums: {
      game_status: GameStatus
    }
  }
}
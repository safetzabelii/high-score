
export type GameStatus = 'played' | 'playing' | 'backlog' | 'wishlist' | 'completed' | 'abandoned'


export interface UserRow {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  banner_url: string | null
  banner_y: number      // 0-100, vertical position % for banner crop
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
  playthrough_number: number  // 1-based, allows multiple logs per game
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

export interface ListRow {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ListItemRow {
  id: string
  list_id: string
  game_id: number
  note: string | null
  position: number
  created_at: string
}

export interface CommentRow {
  id: string
  log_id: string
  user_id: string
  text: string
  created_at: string
}

export interface FavoriteGameRow {
  id: string
  user_id: string
  game_id: number
  position: number
  created_at: string
}

export interface BlockRow {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type NotificationType = 'like' | 'follow' | 'comment'

export interface NotificationRow {
  id: string
  user_id: string           // recipient
  actor_id: string          // who triggered it
  type: NotificationType
  log_id: string | null     // for likes
  read: boolean
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

export type InsertGame = Omit<GameRow, 'created_at'>
export type UpdateUser = Partial<Pick<UserRow, 'display_name' | 'avatar_url' | 'banner_url' | 'banner_y' | 'bio'>>


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
      notifications: {
        Row: NotificationRow
        Insert: Omit<NotificationRow, 'id' | 'created_at' | 'read'>
        Update: Partial<Pick<NotificationRow, 'read'>>
      }
      lists: {
        Row: ListRow
        Insert: Omit<ListRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<ListRow, 'title' | 'description' | 'is_public'>>
      }
      list_items: {
        Row: ListItemRow
        Insert: Omit<ListItemRow, 'id' | 'created_at'>
        Update: Partial<Pick<ListItemRow, 'note' | 'position'>>
      }
      comments: {
        Row: CommentRow
        Insert: Omit<CommentRow, 'id' | 'created_at'>
        Update: Partial<Pick<CommentRow, 'text'>>
      }
      favorite_games: {
        Row: FavoriteGameRow
        Insert: Omit<FavoriteGameRow, 'id' | 'created_at'>
        Update: Partial<Pick<FavoriteGameRow, 'position'>>
      }
      blocks: {
        Row: BlockRow
        Insert: Omit<BlockRow, 'id' | 'created_at'>
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
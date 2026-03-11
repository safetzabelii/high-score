# HIGH-SCORE → Letterboxd-Style Overhaul Plan

## Overview
Transform HIGH-SCORE from its current indigo/zinc dark theme into a Letterboxd-inspired design: dark blue-gray palette, green accent color, serif typography for content, fixed-width layout with sidebar, thin dividers instead of card borders, and film-strip poster grids.

---

## Phase 1: Design System Foundation

### 1.1 Color Palette Overhaul (`globals.css`)
Replace the current zinc/indigo palette with Letterboxd-inspired colors:
- **Background**: `#14181C` (body), `#1B2028` (cards/elevated), `#2C3440` (secondary surfaces)
- **Text hierarchy**: `#FFFFFF` (headings) → `#D8E0E8` (strong) → `#99AABB` (body) → `#778899` (muted) → `#556677` (faintest)
- **Primary accent (green)**: `#00E054` (stars, active states), `#00C030` (buttons), `#00AC1C` (hover)
- **Secondary accent (blue)**: `#40BCF4` (links)
- **Like color (orange)**: `#FF8000` (hearts/likes)
- **Remove indigo** entirely as accent — replace with green everywhere

### 1.2 Typography (`layout.tsx` + `globals.css`)
- **UI font**: Keep Inter (close enough to Letterboxd's Graphik)
- **Add serif font**: Import "DM Serif Display" or "Playfair Display" for game titles & review body text (replaces Letterboxd's Tiempos)
- **Heading styles**: Game titles in serif bold, section headings in 11px uppercase Inter with 1px letter-spacing in muted color
- **Body text**: Reviews/descriptions in serif 16px, line-height 1.667

### 1.3 Layout Grid (`globals.css` + layout)
- **Container max-width**: `960px` centered (close to Letterboxd's 950px)
- **Two-column layout**: Main content ~680px + Sidebar ~230px with ~40px gap
- **Section dividers**: Replace card borders/shadows with thin 1px `#2C3440` horizontal lines
- **Remove glass/noise effects** — Letterboxd uses flat, clean surfaces

### 1.4 Custom Utilities Update
- Remove: `.glass`, `.gradient-border`, `.noise`
- Update: `.card-hover` to subtle opacity change instead of lift/shadow
- Add: `.section-heading` (11px uppercase, letter-spacing, muted color)
- Add: `.divider` (1px border-bottom in subtle dark)

---

## Phase 2: Navigation Bar

### 2.1 Navbar Redesign (`navbar.tsx`)
Restructure to match Letterboxd's horizontal nav:
- **Left**: Logo (3 colored dots: orange/green/blue + "HIGH-SCORE" text)
- **Center-left nav links**: GAMES, LISTS, MEMBERS (uppercase, 13px, bold, letter-spacing 1px)
- **Right**: Search icon, Notification bell, User avatar dropdown, **"+LOG" green button**
- **Styling**: Semi-transparent dark background, ~72px height, fixed container width
- Remove ThemeToggle from navbar (move to settings or footer)
- **Mobile**: Hamburger menu with slide-out drawer

### 2.2 User Dropdown
Match Letterboxd's menu items:
- Home, Profile, Games, Diary(?→Activity), Reviews, Backlog, Lists, Likes, Stats, Settings, Sign Out

---

## Phase 3: Home Page Overhaul

### 3.1 Welcome Section (`page.tsx`)
- "Welcome back, **{name}**. Here's what your friends have been playing..." in italic serif
- Clean, minimal — no hero backdrop images, no stat badges

### 3.2 Content Sections (ordered)
1. **NEW FROM FRIENDS** — Horizontal scroll of 6 game cover cards with username overlay bars at bottom
2. **POPULAR WITH FRIENDS** — 6-column poster grid
3. **POPULAR REVIEWS** — 2-column layout: game cover thumbnail + reviewer avatar + name + stars + review excerpt + like action
4. **POPULAR LISTS** — 3-column grid: 5 overlapping cover thumbnails + list title + author + game count + likes
5. **RECENT ACTIVITY** — Sidebar-style activity feed

### 3.3 Section Heading Pattern
- ALL CAPS, 11px, letter-spacing 0.75px, color `#556677`
- Right-aligned "MORE →" link
- Thin divider line below heading

### 3.4 Sidebar (right column, 230px)
- Quick stats (clickable numbers)
- Recent activity (compact timeline entries)
- Popular members (small avatar grid)

---

## Phase 4: Game Detail Page

### 4.1 Hero Section (`game/[slug]/page.tsx`)
- **Full-width backdrop**: Game screenshot/artwork with gradient fade to body bg
- **Navbar overlays** the backdrop (transparent header)

### 4.2 Two-Column Layout Below Hero
**Left column (poster + metadata):**
- Game cover poster (~230px wide, overlapping backdrop bottom edge)
- Stats bar below: eye icon + plays count | heart icon + likes | list icon + lists
- Platform availability (if applicable)

**Right column (content):**
- **Game title**: Serif font, 32px, bold, white
- **Year + Developer**: Year as link, developer as bold link
- **Genres**: Inline pill tags
- **Summary**: Serif 16px body text in `#99AABB`
- **Tab navigation**: DETAILS | PLATFORMS | SIMILAR (uppercase, green underline active state)

### 4.3 Sidebar Actions Panel
- Played / Liked / Backlog icons row (like Letterboxd's Watched/Liked/Watchlist)
- Star rating (large green stars)
- "Review or log..." link
- "Add to lists..." link
- **Rating histogram** (10 bars for 0.5-5.0 scale, community aggregate)

### 4.4 Reviews Section
- "REVIEWS FROM FRIENDS" + "MORE" link
- Review cards: avatar (40px) | "Review by **username** ★★★★" | serif review text | "♥ Like review · X likes"
- Thin dividers between reviews

---

## Phase 5: Profile Page

### 5.1 Profile Header (`profile/[username]/page.tsx`)
- **Avatar**: 100px circle
- **Display name**: 24px, white
- **Follow button**: Green badge next to name (uppercase "FOLLOW")
- **Stats bar**: Games | This Year | Lists | Following | Followers (numbers large, labels small caps below)
- **Tab navigation**: Profile | Activity | Games | Reviews | Backlog | Lists | Likes

### 5.2 Profile Content (two-column)
**Main column:**
- **FAVORITE GAMES**: 4 large covers side by side (placeholder: top-rated games)
- **RECENT ACTIVITY**: 4 game covers with stars below
- **RECENT REVIEWS**: Review cards with cover thumbnail + stars + date + text excerpt

**Sidebar:**
- Backlog count + mini cover thumbnails
- Activity timeline (compact)
- Rating distribution mini histogram
- Recent lists (cover collage + title)

---

## Phase 6: Review & Feed Cards

### 6.1 Review Card Redesign (`ReviewCard.tsx`)
- Remove card borders/shadows
- Layout: 40px circular avatar | metadata line (name + stars + icons) | serif body text | like action
- Thin divider between cards
- Truncated text with "...more" link

### 6.2 Feed Card Redesign (`FeedCard.tsx`)
- Game cover thumbnail (70×105px, 2:3 ratio) with small username overlay bar
- Below: date, star rating (green), status icons
- Compact, poster-centric design

### 6.3 Activity Entries
- Compact timeline style: "[User] played and rated [Game] ★★★★ on [Date]"
- Game titles as bold links, inline green stars

---

## Phase 7: Lists

### 7.1 List Card (`lists/page.tsx`)
- 5 game cover thumbnails side by side in clipped container
- Title (bold) + author (avatar + name) + game count + likes
- Full-width horizontal cards with thin dividers

### 7.2 List Detail (`lists/[id]/page.tsx`)
- Backdrop from featured game
- 5-column poster grid (125×187px each)
- Position numbers below posters
- Sidebar: like button, progress bar ("You've played X of Y"), tags

---

## Phase 8: Search

### 8.1 Search Overlay/Page (`search/page.tsx`)
- Clean search input at top
- Tab categories: Games | Users | Lists
- Game results: cover + title + year + developer (horizontal rows)
- User results: avatar + name + username
- Autocomplete dropdown styling (dark bg, hover highlights)

---

## Phase 9: Shared Components

### 9.1 Star Rating (`StarRating.tsx`)
- Change from current color to **green** (`#00E054`)
- Consistent sizes: 12px (inline), 16px (reviews), 24px (detail page actions)

### 9.2 Like Button (`LikeButton.tsx`)
- Change to **orange** (`#FF8000`) when liked
- "♥ Like review · X likes" text format

### 9.3 Comment Section (`CommentSection.tsx`)
- Match Letterboxd comment thread: avatar + username + date + text
- Flat layout, no nesting indentation
- Thin dividers between comments

### 9.4 SpoilerGuard (`SpoilerGuard.tsx`)
- Improve: larger tap target, clearer "Contains spoilers — click to reveal" text
- Match Letterboxd's "This review may contain spoilers" banner style

### 9.5 Poster/Cover Component (NEW)
- Standardized game cover component with consistent 2:3 aspect ratio
- Sizes: sm (70×105), md (125×187), lg (150×225), xl (230×345)
- Hover: subtle border glow, optional tooltip with title + year + rating

---

## Phase 10: Footer

### 10.1 Footer Component (NEW — `components/Footer.tsx`)
- Background matches body
- Links row: About | Stats | Backlog | Lists | Settings
- Copyright: "HIGH-SCORE. Made by Safet Zabeli. Game data from IGDB."
- Subtle, minimal

---

## Phase 11: Polish & Consistency

### 11.1 Remove Unused Styles
- Remove framer-motion animations where unnecessary (keep only meaningful transitions)
- Remove glass/gradient/noise utility classes
- Simplify hover effects to opacity/color changes

### 11.2 Poster Aspect Ratios
- Audit ALL game cover displays — enforce 2:3 (portrait) aspect ratio everywhere
- Consistent rounded corners (4px)

### 11.3 Section Heading Pattern
- Apply universally: ALL CAPS, small, letter-spaced, muted, with optional "MORE" link

### 11.4 Dark-Only Design
- Remove light theme support — Letterboxd is dark-only
- Remove ThemeToggle from navbar
- Simplify CSS by removing light mode overrides

---

## Implementation Order

1. **Phase 1** — Design system (colors, fonts, layout grid) — affects everything
2. **Phase 2** — Navbar — global, high impact
3. **Phase 9** — Shared components (stars, likes, covers) — used everywhere
4. **Phase 10** — Footer — simple, quick
5. **Phase 3** — Home page — main landing experience
6. **Phase 4** — Game detail — core feature page
7. **Phase 5** — Profile — key social page
8. **Phase 6** — Review/Feed cards — used across pages
9. **Phase 7** — Lists — secondary feature
10. **Phase 8** — Search — secondary feature
11. **Phase 11** — Polish pass

---

## Files That Will Be Modified

### Core
- `src/app/globals.css` — Complete palette/utility overhaul
- `src/app/layout.tsx` — Font imports, container width, remove light theme
- `src/components/navbar.tsx` — Full redesign

### Pages
- `src/app/page.tsx` — Home page restructure
- `src/app/game/[slug]/page.tsx` — Game detail redesign
- `src/app/profile/[username]/page.tsx` — Profile redesign
- `src/app/search/page.tsx` — Search styling
- `src/app/lists/page.tsx` — Lists card redesign
- `src/app/lists/[id]/page.tsx` — List detail redesign
- `src/app/stats/page.tsx` — Stats styling update
- `src/app/notifications/page.tsx` — Notification styling
- `src/app/activity/page.tsx` — Activity timeline styling

### Components
- `src/components/shared/StarRating.tsx` — Green color
- `src/components/shared/LikeButton.tsx` — Orange color
- `src/components/shared/CommentSection.tsx` — Thread redesign
- `src/components/shared/SpoilerGuard.tsx` — Better UX
- `src/components/feed/FeedCard.tsx` — Poster-centric redesign
- `src/components/game/ReviewCard.tsx` — Letterboxd review style
- `src/components/profile/ProfileHeader.tsx` — Stats bar + tabs
- `src/components/profile/GameLogGrid.tsx` — Poster grid
- `src/components/stats/StatsCharts.tsx` — Color update

### New Files
- `src/components/shared/GameCover.tsx` — Standardized cover component
- `src/components/Footer.tsx` — Site footer
- `src/components/shared/SectionHeading.tsx` — Reusable section header

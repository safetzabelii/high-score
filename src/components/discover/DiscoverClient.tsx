"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X, Loader2, Heart, Gamepad2, ArrowRight, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { GameCover } from "@/components/shared/GameCover"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { useGameSearch, type GameSearchResult } from "@/hooks/useGameSearch"
import { cn } from "@/lib/utils"

export interface BaseGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
  rating?: number | null
  developer?: string | null
  summary?: string | null
  genres?: string[]
  screenshot_url?: string | null
}

interface DiscoverClientProps {
  categories: {
    featured: BaseGame[]
    popular: BaseGame[]
    recent: BaseGame[]
    anticipated: BaseGame[]
    topRated: BaseGame[]
    community: BaseGame[]
    rpgs: BaseGame[]
    indies: BaseGame[]
    shooters: BaseGame[]
    adventure: BaseGame[]
    strategy: BaseGame[]
    platformers: BaseGame[]
    fighting: BaseGame[]
    racing: BaseGame[]
    sports: BaseGame[]
    simulators: BaseGame[]
    puzzle: BaseGame[]
    arcade: BaseGame[]
  }
}

// Genre filter options
const GENRE_FILTERS = [
  { key: "all", label: "All Genres" },
  { key: "rpgs", label: "RPG" },
  { key: "shooters", label: "Shooter" },
  { key: "adventure", label: "Adventure" },
  { key: "strategy", label: "Strategy" },
  { key: "platformers", label: "Platformer" },
  { key: "indies", label: "Indie" },
  { key: "fighting", label: "Fighting" },
  { key: "racing", label: "Racing" },
  { key: "sports", label: "Sports" },
  { key: "simulators", label: "Simulator" },
  { key: "puzzle", label: "Puzzle" },
  { key: "arcade", label: "Arcade" },
] as const

// Year range filter options
const YEAR_FILTERS = [
  { key: "all", label: "All Years" },
  { key: "2026", label: "2026" },
  { key: "2025", label: "2025" },
  { key: "2024", label: "2024" },
  { key: "2023", label: "2023" },
  { key: "2020s", label: "2020-2022" },
  { key: "2010s", label: "2010s" },
  { key: "2000s", label: "2000s" },
  { key: "classic", label: "Before 2000" },
] as const

// Rating filter options
const RATING_FILTERS = [
  { key: "all", label: "Any Rating" },
  { key: "9+", label: "9+ Exceptional" },
  { key: "8+", label: "8+ Great" },
  { key: "7+", label: "7+ Good" },
  { key: "6+", label: "6+ Decent" },
] as const

// Sort options
const SORT_OPTIONS = [
  { key: "popular", label: "Most Popular" },
  { key: "rating", label: "Highest Rated" },
  { key: "newest", label: "Newest First" },
  { key: "name", label: "A-Z" },
] as const

type GenreKey = typeof GENRE_FILTERS[number]["key"]
type YearKey = typeof YEAR_FILTERS[number]["key"]
type RatingKey = typeof RATING_FILTERS[number]["key"]
type SortKey = typeof SORT_OPTIONS[number]["key"]

// Reusable horizontal scroll row with arrow buttons
function GameRow({ games }: { games: BaseGame[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    return () => el.removeEventListener("scroll", checkScroll)
  }, [checkScroll])

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.7
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  return (
    <div className="group/row relative">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5 text-zinc-300" />
        </button>
      )}
      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-5 w-5 text-zinc-300" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {games.map((game) => (
          <div key={game.id} className="w-[120px] sm:w-[130px] md:w-[140px] flex-shrink-0">
            <GameCover
              slug={game.slug}
              title={game.title}
              coverUrl={game.cover_url}
              className="w-full"
              showTitle
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Select dropdown component
function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { key: T; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 text-[13px] rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#ff0055]/30 focus:border-[#ff0055]/50 cursor-pointer hover:border-zinc-600 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
    </div>
  )
}

export function DiscoverClient({ categories }: DiscoverClientProps) {
  const {
    featured, popular, recent, anticipated, topRated,
    community, rpgs, indies, shooters, adventure, strategy, platformers,
    fighting, racing, sports, simulators, puzzle, arcade
  } = categories

  // Search state
  const { query, setQuery, results, isLoading, isLoadingMore, hasMore, loadMore, clear } = useGameSearch(350)

  // Featured carousel state
  const [featuredIndex, setFeaturedIndex] = useState(0)

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [genreFilter, setGenreFilter] = useState<GenreKey>("all")
  const [yearFilter, setYearFilter] = useState<YearKey>("all")
  const [ratingFilter, setRatingFilter] = useState<RatingKey>("all")
  const [sortBy, setSortBy] = useState<SortKey>("popular")

  const hasActiveFilters = genreFilter !== "all" || yearFilter !== "all" || ratingFilter !== "all"

  // Build filtered game pool
  const allGames = useMemo(() => {
    const map = new Map<number, BaseGame>()
    const addGames = (games: BaseGame[]) => {
      for (const g of games) if (!map.has(g.id)) map.set(g.id, g)
    }
    addGames(popular)
    addGames(topRated)
    addGames(recent)
    addGames(anticipated)
    addGames(community)
    addGames(rpgs)
    addGames(indies)
    addGames(shooters)
    addGames(adventure)
    addGames(strategy)
    addGames(platformers)
    addGames(fighting)
    addGames(racing)
    addGames(sports)
    addGames(simulators)
    addGames(puzzle)
    addGames(arcade)
    return [...map.values()]
  }, [popular, topRated, recent, anticipated, community, rpgs, indies, shooters, adventure, strategy, platformers, fighting, racing, sports, simulators, puzzle, arcade])

  // Genre-specific pools for genre filter
  const genrePools: Record<string, BaseGame[]> = useMemo(() => ({
    rpgs, indies, shooters, adventure, strategy, platformers,
    fighting, racing, sports, simulators, puzzle, arcade,
  }), [rpgs, indies, shooters, adventure, strategy, platformers, fighting, racing, sports, simulators, puzzle, arcade])

  // Apply filters
  const filteredGames = useMemo(() => {
    let pool = genreFilter !== "all" && genrePools[genreFilter]
      ? genrePools[genreFilter]
      : allGames

    // Year filter
    if (yearFilter !== "all") {
      pool = pool.filter((g) => {
        if (!g.release_year) return false
        switch (yearFilter) {
          case "2026": return g.release_year === 2026
          case "2025": return g.release_year === 2025
          case "2024": return g.release_year === 2024
          case "2023": return g.release_year === 2023
          case "2020s": return g.release_year >= 2020 && g.release_year <= 2022
          case "2010s": return g.release_year >= 2010 && g.release_year <= 2019
          case "2000s": return g.release_year >= 2000 && g.release_year <= 2009
          case "classic": return g.release_year < 2000
          default: return true
        }
      })
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const minRating = parseFloat(ratingFilter)
      pool = pool.filter((g) => g.rating != null && g.rating >= minRating)
    }

    // Sort
    const sorted = [...pool]
    switch (sortBy) {
      case "rating":
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        break
      case "newest":
        sorted.sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0))
        break
      case "name":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "popular":
      default:
        // Keep original order (already sorted by popularity from IGDB)
        break
    }

    return sorted
  }, [allGames, genrePools, genreFilter, yearFilter, ratingFilter, sortBy])

  // Auto-advance featured carousel
  useEffect(() => {
    if (featured.length <= 1 || query.length >= 2) return
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featured.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [featured.length, query])

  // Sections data for the browse section
  const sections = useMemo(() => [
    { title: "Popular This Week", games: popular, href: "/discover/popular" },
    { title: "Trending in the Community", games: community, href: "/discover/community" },
    { title: "Highly Anticipated", games: anticipated, href: "/discover/anticipated" },
    { title: "New Releases", games: recent, href: "/discover/recent" },
    { title: "Highest Rated", games: topRated, href: "/discover/topRated" },
    { title: "Top Role-Playing Games", games: rpgs, href: "/discover/rpgs" },
    { title: "Top Indie Games", games: indies, href: "/discover/indies" },
    { title: "Top Shooters", games: shooters, href: "/discover/shooters" },
    { title: "Top Adventure Games", games: adventure, href: "/discover/adventure" },
    { title: "Top Strategy Games", games: strategy, href: "/discover/strategy" },
    { title: "Top Platformers", games: platformers, href: "/discover/platformers" },
    { title: "Top Fighting Games", games: fighting, href: "/discover/fighting" },
    { title: "Top Racing Games", games: racing, href: "/discover/racing" },
    { title: "Top Sports Games", games: sports, href: "/discover/sports" },
    { title: "Top Simulators", games: simulators, href: "/discover/simulators" },
    { title: "Top Puzzle Games", games: puzzle, href: "/discover/puzzle" },
    { title: "Arcade Classics", games: arcade, href: "/discover/arcade" },
  ], [popular, community, anticipated, recent, topRated, rpgs, indies, shooters, adventure, strategy, platformers, fighting, racing, sports, simulators, puzzle, arcade])

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Discover</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-all",
            showFilters || hasActiveFilters
              ? "bg-[#ff0055]/10 border-[#ff0055]/30 text-[#ff0055]"
              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="bg-[#ff0055] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {[genreFilter !== "all", yearFilter !== "all", ratingFilter !== "all"].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Search input */}
      <div className="relative flex items-center mb-4">
        <Search className="absolute left-4 h-5 w-5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for games..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-12 pr-10 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff0055]/20 focus:border-[#ff0055]/30 transition-colors"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
            <FilterSelect value={genreFilter} onChange={setGenreFilter} options={GENRE_FILTERS} />
            <FilterSelect value={yearFilter} onChange={setYearFilter} options={YEAR_FILTERS} />
            <FilterSelect value={ratingFilter} onChange={setRatingFilter} options={RATING_FILTERS} />
            <div className="hidden sm:block h-5 w-px bg-zinc-700/50 mx-1" />
            <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setGenreFilter("all")
                  setYearFilter("all")
                  setRatingFilter("all")
                  setSortBy("popular")
                }}
                className="ml-auto text-[12px] text-zinc-500 hover:text-[#ff0055] transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtered results view */}
      {hasActiveFilters ? (
        <div className="animate-in fade-in duration-300 pb-12">
          <div className="flex items-center gap-2 mb-4 text-zinc-400">
            <SlidersHorizontal className="h-4 w-4" />
            <p className="text-sm font-medium">
              {filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {filteredGames.length === 0 ? (
            <div className="py-16 text-center">
              <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No games match your filters</p>
              <button
                onClick={() => {
                  setGenreFilter("all")
                  setYearFilter("all")
                  setRatingFilter("all")
                }}
                className="mt-3 text-sm text-[#ff0055] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {filteredGames.map((game) => (
                <div key={game.id}>
                  <GameCover
                    slug={game.slug}
                    title={game.title}
                    coverUrl={game.cover_url}
                    className="w-full"
                    showTitle
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : query.length >= 2 ? (
        /* Search results */
        <div className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2 text-zinc-400">
            <Search className="h-4 w-4" />
            <h2 className="text-sm font-medium">Results for &ldquo;{query}&rdquo;</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center">
              <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">
                No games found for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {results.map((game, i) => (
                  <GameCard key={game.objectID ?? game.id ?? i} game={game} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#ff0055]" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load more results
                        <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Browse sections */
        <div className="space-y-12 animate-in fade-in duration-500 pb-12">

          {/* ─── Featured & Recommended ────────────────────── */}
          {featured.length > 0 && (
            <section className="mb-14">
              <SectionHeading title="FEATURED & RECOMMENDED" />

              <div className="relative h-[320px] sm:h-[380px] w-full rounded-lg overflow-hidden">
                {featured.map((game, i) => {
                  const bgImg = game.screenshot_url || game.cover_url
                  return (
                    <div
                      key={game.id}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-700",
                        i === featuredIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                      )}
                    >
                      {/* Full-bleed screenshot background */}
                      {bgImg && (
                        <Image
                          src={bgImg}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="960px"
                          priority={i === 0}
                        />
                      )}
                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-zinc-950/30" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/40" />

                      {/* Content overlay — left-aligned */}
                      <div className="absolute inset-0 flex items-end p-6 sm:p-8">
                        <div className="flex gap-5 items-end max-w-[75%]">
                          {/* Cover art */}
                          <Link href={`/game/${game.slug}`} className="relative w-[100px] sm:w-[120px] aspect-[3/4] flex-shrink-0 rounded overflow-hidden ring-1 ring-white/10 hover:ring-[#ff0055]/50 transition-all">
                            {game.cover_url && (
                              <Image
                                src={game.cover_url}
                                alt={game.title}
                                fill
                                className="object-cover"
                                sizes="120px"
                              />
                            )}
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {game.genres?.slice(0, 3).map((g) => (
                                <span key={g} className="text-[10px] font-semibold uppercase tracking-wider text-[#ff0055]/80 bg-[#ff0055]/10 px-2 py-0.5 rounded">
                                  {g}
                                </span>
                              ))}
                            </div>

                            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-1.5">
                              <Link href={`/game/${game.slug}`} className="hover:text-[#ff0055] transition-colors">
                                {game.title}
                              </Link>
                            </h3>

                            <div className="flex items-center gap-3 text-[12px] text-zinc-400 mb-2.5">
                              {game.release_year && <span>{game.release_year}</span>}
                              {game.developer && (
                                <>
                                  <span className="text-zinc-600">·</span>
                                  <span>{game.developer}</span>
                                </>
                              )}
                              {game.rating != null && (
                                <>
                                  <span className="text-zinc-600">·</span>
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 fill-[#ff0055] text-[#ff0055]" />
                                    {game.rating.toFixed(1)}
                                  </span>
                                </>
                              )}
                            </div>

                            {game.summary && (
                              <p className="hidden sm:block text-[13px] text-zinc-400 leading-relaxed line-clamp-2 max-w-lg">
                                {game.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Navigation dots — bottom right */}
                      <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-medium tabular-nums mr-1">
                          {i + 1}/{featured.length}
                        </span>
                        {featured.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            onClick={() => setFeaturedIndex(dotIdx)}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              dotIdx === featuredIndex ? "w-5 bg-[#ff0055]" : "w-1.5 bg-zinc-600 hover:bg-zinc-400"
                            )}
                            aria-label={`View featured game ${dotIdx + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* All browse sections */}
          {sections.map(({ title, games, href }) =>
            games.length > 0 ? (
              <section key={title}>
                <SectionHeading title={title} moreHref={href} />
                <GameRow games={games} />
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

function GameCard({ game }: { game: GameSearchResult }) {
  return (
    <Link href={`/game/${game.slug}`} className="group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 transition-transform poster-hover">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-600">
            {game.title}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-sm font-medium text-white leading-tight line-clamp-2">
              {game.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
              {game.release_year && <span>{game.release_year}</span>}
              {game.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Heart className="h-3 w-3 fill-[#ff0055] text-[#ff0055]" />
                  {game.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
        {game.title}
      </p>
      <p className="text-xs text-zinc-600 truncate">
        {[game.developer, game.release_year].filter(Boolean).join(" · ")}
      </p>
    </Link>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X, Loader2, Star, Gamepad2, ArrowRight } from "lucide-react"
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

  // Auto-advance featured carousel
  useEffect(() => {
    if (featured.length <= 1 || query.length >= 2) return
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featured.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [featured.length, query])
  
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Discover</h1>

      {/* Search input matching /search exactly */}
      <div className="relative flex items-center mb-8">
        <Search className="absolute left-4 h-5 w-5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for games..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-12 pr-10 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green/30 focus:border-transparent transition-colors"
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

      {query.length >= 2 ? (
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
                        <Loader2 className="h-4 w-4 animate-spin text-hs-green" />
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
        <div className="space-y-12 animate-in fade-in duration-500 pb-12">
          
          {/* ─── Featured & Recommended (Steam-style Carousel) ────────────────────── */}
          {featured.length > 0 && (
            <section className="mb-14">
              <SectionHeading title="FEATURED & RECOMMENDED" />
              
              <div className="relative h-[300px] sm:h-[400px] w-full bg-zinc-900 rounded-lg shadow-2xl overflow-hidden group">
                {featured.map((game, i) => (
                  <div
                    key={game.id}
                    className={cn(
                      "absolute inset-0 flex transition-opacity duration-700",
                      i === featuredIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    )}
                  >
                    {/* Left side: Large Cover */}
                    <Link href={`/game/${game.slug}`} className="relative w-[60%] sm:w-[65%] h-full bg-black block group/cover">
                      {game.cover_url ? (
                        <>
                          <Image
                            src={game.cover_url}
                            alt={game.title}
                            fill
                            className="object-cover opacity-90 transition-transform duration-700 group-hover/cover:scale-105"
                            sizes="(max-width: 640px) 60vw, 65vw"
                            priority={i === 0}
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-zinc-900 transition-opacity" />
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-700 bg-zinc-950">
                          {game.title}
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-xs font-bold text-white shadow-lg pointer-events-none border border-white/10 flex items-center gap-1.5">
                        {game.rating && (
                          <span className="text-yellow-400 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {game.rating.toFixed(1)}
                          </span>
                        )}
                        <span>{game.release_year}</span>
                      </div>
                    </Link>

                    {/* Right side: Info panel (Steam style) */}
                    <div className="w-[40%] sm:w-[35%] h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col p-4 sm:p-6 border-l border-zinc-700/50">
                      <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight line-clamp-2 mb-2 group-hover:text-hs-blue transition-colors">
                        <Link href={`/game/${game.slug}`}>
                          {game.title}
                        </Link>
                      </h3>
                      
                      <div className="hidden sm:flex flex-wrap gap-2 mb-auto text-xs">
                        {game.developer && (
                          <span className="bg-black/30 px-2 py-1 rounded text-zinc-400 max-w-full truncate">
                            {game.developer}
                          </span>
                        )}
                      </div>

                      {/* Carousel controls - Bottom of right panel */}
                      <div className="mt-auto flex flex-col gap-3">
                        <Link 
                          href={`/game/${game.slug}`} 
                          className="w-full py-2 bg-hs-green/20 hover:bg-hs-green/30 text-hs-green font-semibold text-[13px] rounded transition-colors text-center border border-hs-green/20"
                        >
                          View Game Logs
                        </Link>

                        <div className="flex items-center justify-between">
                          <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            {i + 1} / {featured.length}
                          </p>
                          <div className="flex gap-1.5">
                            {featured.map((_, dotIdx) => (
                              <button
                                key={dotIdx}
                                onClick={() => setFeaturedIndex(dotIdx)}
                                className={cn(
                                  "h-1.5 rounded-full transition-all",
                                  dotIdx === featuredIndex ? "w-4 bg-zinc-300" : "w-1.5 bg-zinc-600 hover:bg-zinc-500"
                                )}
                                aria-label={`View featured game ${dotIdx + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {popular.length > 0 && (
            <section>
              <SectionHeading title="Popular This Week" moreHref="/discover/popular" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {popular.map((game) => (
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
            </section>
          )}

          {community && community.length > 0 && (
            <section>
              <SectionHeading title="Trending in the Community" moreHref="/discover/community" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {community.map((game) => (
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
            </section>
          )}

          {anticipated.length > 0 && (
            <section>
              <SectionHeading title="Highly Anticipated" moreHref="/discover/anticipated" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {anticipated.map((game) => (
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
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <SectionHeading title="New Releases" moreHref="/discover/recent" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {recent.map((game) => (
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
            </section>
          )}

          {topRated.length > 0 && (
            <section>
              <SectionHeading title="Highest Rated" moreHref="/discover/topRated" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {topRated.map((game) => (
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
            </section>
          )}

          {rpgs.length > 0 && (
            <section>
              <SectionHeading title="Top Role-Playing Games" moreHref="/discover/rpgs" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {rpgs.map((game) => (
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
            </section>
          )}

          {indies.length > 0 && (
            <section>
              <SectionHeading title="Top Indie Games" moreHref="/discover/indies" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {indies.map((game) => (
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
            </section>
          )}
          
          {shooters.length > 0 && (
            <section>
              <SectionHeading title="Top Shooters" moreHref="/discover/shooters" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {shooters.map((game) => (
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
            </section>
          )}

          {adventure.length > 0 && (
            <section>
              <SectionHeading title="Top Adventure Games" moreHref="/discover/adventure" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {adventure.map((game) => (
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
            </section>
          )}

          {strategy.length > 0 && (
            <section>
              <SectionHeading title="Top Strategy Games" moreHref="/discover/strategy" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {strategy.map((game) => (
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
            </section>
          )}

          {platformers.length > 0 && (
            <section>
              <SectionHeading title="Top Platformers" moreHref="/discover/platformers" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {platformers.map((game) => (
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
            </section>
          )}

          {fighting.length > 0 && (
            <section>
              <SectionHeading title="Top Fighting Games" moreHref="/discover/fighting" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {fighting.map((game) => (
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
            </section>
          )}

          {racing.length > 0 && (
            <section>
              <SectionHeading title="Top Racing Games" moreHref="/discover/racing" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {racing.map((game) => (
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
            </section>
          )}

          {sports.length > 0 && (
            <section>
              <SectionHeading title="Top Sports Games" moreHref="/discover/sports" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {sports.map((game) => (
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
            </section>
          )}

          {simulators.length > 0 && (
            <section>
              <SectionHeading title="Top Simulators" moreHref="/discover/simulators" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {simulators.map((game) => (
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
            </section>
          )}

          {puzzle.length > 0 && (
            <section>
              <SectionHeading title="Top Puzzle Games" moreHref="/discover/puzzle" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {puzzle.map((game) => (
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
            </section>
          )}

          {arcade.length > 0 && (
            <section>
              <SectionHeading title="Arcade Classics" moreHref="/discover/arcade" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {arcade.map((game) => (
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
            </section>
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
            unoptimized
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
                  <Star className="h-3 w-3 fill-hs-green text-hs-green" />
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

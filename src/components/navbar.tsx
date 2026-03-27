"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogOut, User as UserIcon, Loader2, Search, Settings, List, Clock, BarChart3, Gamepad2, Heart, Layers, Menu, X as XIcon, GitCompareArrows } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LogGameButton } from "@/components/shared/LogGameButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MorphLogo } from "@/components/MorphLogo";
import { cn } from "@/lib/utils";
import { useGameSearch as useGameSearchHook } from "@/hooks/useGameSearch";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("Gamer");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { query: gameQuery, results: gameResults, isLoading: gameSearchLoading, setQuery: setGameQuery, clear: clearGameSearch } = useGameSearchHook(300);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setGameQuery("");
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
        setGameQuery("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setGameQuery]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  }

  function handleSearchInputChange(val: string) {
    setSearchQuery(val);
    setGameQuery(val);
  }

  // Auth transition state — only used on login/signup pages
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const pendingUserRef = useRef<User | null | undefined>(undefined);
  const pendingUsernameRef = useRef<string>("Gamer");
  const pendingAvatarRef = useRef<string | null>(null);

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // When pathname changes away from auth page, apply pending state
  useEffect(() => {
    if (authTransitioning && pendingUserRef.current !== undefined && !isAuthPage) {
      setUser(pendingUserRef.current);
      setUsername(pendingUsernameRef.current);
      setAvatarUrl(pendingAvatarRef.current);
      pendingUserRef.current = undefined;
      setAuthTransitioning(false);
    }
  }, [pathname, authTransitioning, isAuthPage]);

  // Helper: fetch avatar without blocking
  const fetchAvatar = async (userId: string) => {
    const { data: profile } = await (supabase
      .from("users")
      .select("avatar_url")
      .eq("id", userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as any);
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    return profile?.avatar_url ?? null;
  };

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Show the user immediately — no waiting for avatar
        setUser(session.user);
        setUsername(session.user.user_metadata?.username || "Gamer");
        setLoading(false);
        // Fetch avatar in background
        fetchAvatar(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION — already handled by initialize() above
      if (event === "INITIAL_SESSION") return;

      if (session) {
        const newUsername = session.user.user_metadata?.username || "Gamer";
        const onAuthPage = window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/signup");

        if (event === "SIGNED_IN" && onAuthPage) {
          // Fetch avatar first, then defer until navigation
          const avatar = await fetchAvatar(session.user.id);
          pendingUserRef.current = session.user;
          pendingUsernameRef.current = newUsername;
          pendingAvatarRef.current = avatar;
          setAuthTransitioning(true);

          router.refresh();
          router.push("/");
        } else {
          // TOKEN_REFRESHED or SIGNED_IN on non-auth page — apply immediately
          setUser(session.user);
          setUsername(newUsername);
          // Avatar fetch in background (don't block)
          fetchAvatar(session.user.id);
        }
      } else {
        const onAuthPage = window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/signup");

        if (event === "SIGNED_OUT" && !onAuthPage) {
          pendingUserRef.current = null;
          pendingUsernameRef.current = "Gamer";
          pendingAvatarRef.current = null;
          setAuthTransitioning(true);
        } else {
          setUser(null);
          setUsername("Gamer");
          setAvatarUrl(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Signed out.");
      router.refresh();
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/discover", label: "GAMES" },
    { href: "/lists", label: "LISTS" },
    { href: "/search?tab=users", label: "MEMBERS" },
  ];

  // Check if a nav link is active, accounting for query params
  const isNavActive = (href: string) => {
    const [linkPath, linkQuery] = href.split("?")
    if (pathname !== linkPath) return false
    if (!linkQuery) return true
    // If link has query params, check they match
    const params = new URLSearchParams(linkQuery)
    for (const [key, value] of params) {
      if (searchParams.get(key) !== value) return false
    }
    return true
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const showLoading = loading || authTransitioning;

  return (
    <nav className="sticky top-0 z-50 w-full bg-zinc-950 border-b border-zinc-700">
      <div className="mx-auto flex h-14 sm:h-[72px] max-w-[960px] items-center justify-between px-4">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 group sm:mr-4">
            <MorphLogo />
          </Link>

          {/* Nav links — desktop only */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[11px] font-bold tracking-[0.1em] px-2.5 py-1.5 transition-colors",
                  isNavActive(link.href)
                    ? "text-zinc-50"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {showLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : user ? (
            <>
              {/* Expandable search */}
              {searchOpen ? (
                <div className="relative flex items-center">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      placeholder="Search games..."
                      className="w-48 sm:w-64 rounded-lg border border-zinc-700/60 bg-zinc-900 pl-8 pr-8 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-all"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); setGameQuery(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </form>

                  {/* Inline search results dropdown */}
                  {searchQuery.length >= 2 && (
                    <div className="absolute top-full right-0 mt-1.5 w-72 sm:w-80 rounded-lg border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/50 z-50 overflow-hidden max-h-80 overflow-y-auto">
                      {gameSearchLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-zinc-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Searching...
                        </div>
                      ) : gameResults.length === 0 ? (
                        <div className="py-6 text-center text-[12px] text-zinc-600">
                          No results for &ldquo;{searchQuery}&rdquo;
                        </div>
                      ) : (
                        <>
                          <ul className="py-1">
                            {gameResults.slice(0, 6).map((game, i) => {
                              const gameId = game.igdb_id ?? game.id ?? Number(game.objectID)
                              return (
                                <li key={gameId ?? i}>
                                  <Link
                                    href={`/game/${game.slug}`}
                                    onClick={() => { setSearchOpen(false); setSearchQuery(""); setGameQuery(""); }}
                                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900/60 transition-colors"
                                  >
                                    <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded-[2px] bg-zinc-800 border border-zinc-700/30">
                                      {game.cover_url ? (
                                        <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="28px" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                          <Gamepad2 className="h-3 w-3" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[13px] text-zinc-200 truncate">{game.title}</p>
                                      <p className="text-[11px] text-zinc-600 truncate">
                                        {[game.release_year, game.developer].filter(Boolean).join(" · ")}
                                      </p>
                                    </div>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                          <Link
                            href={`/search?q=${encodeURIComponent(searchQuery)}`}
                            onClick={() => { setSearchOpen(false); setSearchQuery(""); setGameQuery(""); }}
                            className="block border-t border-zinc-800/60 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-300 transition-colors"
                          >
                            View all results
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded transition-colors",
                    pathname === "/search"
                      ? "text-zinc-50"
                      : "text-zinc-400 hover:text-zinc-100"
                  )}
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
              )}

              <NotificationBell />

              {/* User avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-7 w-7 rounded-full p-0 hover:ring-1 hover:ring-zinc-600 transition-all">
                    <Avatar className="h-7 w-7">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={username} fill className="object-cover rounded-full" />
                      ) : (
                        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[10px] font-semibold">
                          {username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 border-zinc-700/60 bg-zinc-900 text-zinc-100" align="end" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-50">{username}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-700/40" />
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/">
                      <Gamepad2 className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Home
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href={`/profile/${username}`}>
                      <UserIcon className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/activity">
                      <Clock className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Activity
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/backlog">
                      <Layers className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Backlog
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/lists">
                      <List className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Lists
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/stats">
                      <BarChart3 className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Stats
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/compare">
                      <GitCompareArrows className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Compare
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3 text-zinc-300 hover:text-zinc-50">
                    <Link href="/settings">
                      <Settings className="mr-2.5 h-3.5 w-3.5 text-zinc-500" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-700/40" />
                  <DropdownMenuItem className="cursor-pointer text-red-400 hover:text-red-300 px-3" onClick={handleSignOut}>
                    <LogOut className="mr-2.5 h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* +LOG green button — hidden on small mobile */}
              <div className="hidden sm:block">
                <LogGameButton />
              </div>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex md:hidden h-8 w-8 items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {searchOpen ? (
                <div className="relative flex items-center">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      placeholder="Search games..."
                      className="w-48 sm:w-64 rounded-lg border border-zinc-700/60 bg-zinc-900 pl-8 pr-8 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-all"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); setGameQuery(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  {searchQuery.length >= 2 && (
                    <div className="absolute top-full right-0 mt-1.5 w-72 sm:w-80 rounded-lg border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/50 z-50 overflow-hidden max-h-80 overflow-y-auto">
                      {gameSearchLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-zinc-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        </div>
                      ) : gameResults.length === 0 ? (
                        <div className="py-6 text-center text-[12px] text-zinc-600">
                          No results
                        </div>
                      ) : (
                        <>
                          <ul className="py-1">
                            {gameResults.slice(0, 6).map((game, i) => (
                              <li key={game.igdb_id ?? game.id ?? i}>
                                <Link
                                  href={`/game/${game.slug}`}
                                  onClick={() => { setSearchOpen(false); setSearchQuery(""); setGameQuery(""); }}
                                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900/60 transition-colors"
                                >
                                  <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded-[2px] bg-zinc-800 border border-zinc-700/30">
                                    {game.cover_url ? (
                                      <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="28px" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                        <Gamepad2 className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] text-zinc-200 truncate">{game.title}</p>
                                    <p className="text-[11px] text-zinc-600 truncate">
                                      {[game.release_year, game.developer].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <Link
                            href={`/search?q=${encodeURIComponent(searchQuery)}`}
                            onClick={() => { setSearchOpen(false); setSearchQuery(""); setGameQuery(""); }}
                            className="block border-t border-zinc-800/60 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-300 transition-colors"
                          >
                            View all results
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
              )}
              <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 text-[11px] font-bold tracking-[0.1em] uppercase px-2 sm:px-3">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-hs-green-button text-white hover:bg-hs-green-hover text-[11px] font-bold tracking-[0.05em] uppercase rounded-sm hidden sm:inline-flex">
                <Link href="/signup">Create account</Link>
              </Button>

              {/* Mobile hamburger for logged-out users */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex md:hidden h-8 w-8 items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-[960px] px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block py-2.5 px-3 rounded text-[13px] font-bold tracking-[0.05em] transition-colors",
                  isNavActive(link.href)
                    ? "text-zinc-50 bg-zinc-800/50"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30"
                )}
              >
                {link.label}
              </Link>
            ))}
            {/* Show +LOG on mobile menu for logged-in users */}
            {user && (
              <div className="pt-2 sm:hidden">
                <LogGameButton />
              </div>
            )}
            {/* Show Create account on mobile menu for logged-out users */}
            {!user && (
              <div className="pt-2 sm:hidden">
                <Button asChild size="sm" className="w-full bg-hs-green-button text-white hover:bg-hs-green-hover text-[11px] font-bold tracking-[0.05em] uppercase rounded-sm">
                  <Link href="/signup">Create account</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogOut, User as UserIcon, Loader2, Search, Settings, List, Clock, BarChart3, Gamepad2, Heart, Layers } from "lucide-react";
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

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("Gamer");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Track whether we're in the middle of an auth transition
  // (signed in but still on /login, or signed out but still on /)
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const pendingUserRef = useRef<User | null | undefined>(undefined);
  const pendingUsernameRef = useRef<string>("Gamer");
  const pendingAvatarRef = useRef<string | null>(null);

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // When pathname changes, apply any pending auth state
  useEffect(() => {
    if (authTransitioning && pendingUserRef.current !== undefined) {
      setUser(pendingUserRef.current);
      setUsername(pendingUsernameRef.current);
      setAvatarUrl(pendingAvatarRef.current);
      pendingUserRef.current = undefined;
      setAuthTransitioning(false);
    }
  }, [pathname, authTransitioning]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setUsername(session.user.user_metadata?.username || "Gamer");
        // Fetch avatar
        const { data: profile } = await (supabase
          .from("users")
          .select("avatar_url")
          .eq("id", session.user.id)
          .single() as any);
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      }
      setLoading(false);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const newUsername = session.user.user_metadata?.username || "Gamer";

        // Fetch avatar
        const { data: profile } = await (supabase
          .from("users")
          .select("avatar_url")
          .eq("id", session.user.id)
          .single() as any);
        const newAvatar = profile?.avatar_url ?? null;

        if (event === "SIGNED_IN") {
          // User just signed in — defer the navbar update until we leave the login page
          // This keeps the navbar in sync with the page content
          pendingUserRef.current = session.user;
          pendingUsernameRef.current = newUsername;
          pendingAvatarRef.current = newAvatar;
          setAuthTransitioning(true);

          // Trigger navigation to home
          router.refresh();
          router.push("/");
        } else {
          // TOKEN_REFRESHED or other events — apply immediately
          setUser(session.user);
          setUsername(newUsername);
          setAvatarUrl(newAvatar);
        }
      } else {
        if (event === "SIGNED_OUT") {
          // Defer clearing until we've navigated to /login
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

  // During auth transition, show the loading spinner
  const showLoading = loading || authTransitioning;

  return (
    <nav className="sticky top-0 z-50 w-full bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-700">
      <div className="mx-auto flex h-[72px] max-w-[960px] items-center justify-between px-4">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group mr-4">
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
                  pathname === link.href || (link.href === "/search" && pathname === "/search")
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
        <div className="flex items-center gap-2">
          {showLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : user ? (
            <>
              <Link
                href="/search"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded transition-colors",
                  pathname === "/search"
                    ? "text-zinc-50"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </Link>

              <NotificationBell />

              {/* User avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-7 w-7 rounded-full p-0 hover:ring-1 hover:ring-zinc-600 transition-all">
                    <Avatar className="h-7 w-7">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={username} fill className="object-cover rounded-full" unoptimized />
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

              {/* +LOG green button */}
              <LogGameButton />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/search"
                className="flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </Link>
              <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 text-[11px] font-bold tracking-[0.1em] uppercase">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-hs-green-button text-white hover:bg-hs-green-hover text-[11px] font-bold tracking-[0.05em] uppercase rounded-sm">
                <Link href="/signup">Create account</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
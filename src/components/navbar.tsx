"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Gamepad2, LogOut, User as UserIcon, Loader2, Search, Settings, List, Clock, BarChart3 } from "lucide-react";
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
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("Gamer");

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setUsername(session.user.user_metadata?.username || "Gamer");
      }
      setLoading(false);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        setUsername(session.user.user_metadata?.username || "Gamer");
      } else {
        setUsername("Gamer");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Signed out.");
      router.refresh();
      router.push("/login")
    }
  };

  const navLinks = [
    { href: "/lists", label: "Lists" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800/80 glass">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Nav Links */}
        <div className="flex items-center gap-1 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 group mr-2 sm:mr-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 transition-transform group-hover:scale-105">
              <Gamepad2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-mono font-bold tracking-tighter text-base text-zinc-50 hidden sm:block">
              HIGH-SCORE
            </span>
          </Link>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors rounded-md px-2.5 py-1.5",
                pathname === link.href
                  ? "text-zinc-50 bg-zinc-800/60"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : user ? (
            <>
              <Link
                href="/search"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  pathname === "/search"
                    ? "text-zinc-50 bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                )}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Link>

              <NotificationBell />
              <ThemeToggle />
              <LogGameButton />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative ml-1 h-8 w-8 rounded-full p-0 ring-1 ring-zinc-700 hover:ring-zinc-600 transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
                        {username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 border-zinc-800 bg-zinc-950 text-zinc-50" align="end" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-100">{username}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800/60" />
                  <DropdownMenuItem asChild className="cursor-pointer px-3">
                    <Link href={`/profile/${username}`}>
                      <UserIcon className="mr-2.5 h-4 w-4 text-zinc-500" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3">
                    <Link href="/lists">
                      <List className="mr-2.5 h-4 w-4 text-zinc-500" />
                      My Lists
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3">
                    <Link href="/activity">
                      <Clock className="mr-2.5 h-4 w-4 text-zinc-500" />
                      Activity
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3">
                    <Link href="/stats">
                      <BarChart3 className="mr-2.5 h-4 w-4 text-zinc-500" />
                      Stats
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer px-3">
                    <Link href="/settings">
                      <Settings className="mr-2.5 h-4 w-4 text-zinc-500" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800/60" />
                  <DropdownMenuItem className="cursor-pointer text-red-400 px-3" onClick={handleSignOut}>
                    <LogOut className="mr-2.5 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/search"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Link>
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200 text-sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-medium shadow-lg shadow-indigo-600/20">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

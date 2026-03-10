"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gamepad2, LogOut, User as UserIcon, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js"; // Proper Type
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

export default function Navbar() {
  const router = useRouter();
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2 text-zinc-50 hover:opacity-80 transition-opacity">
          <Gamepad2 className="h-6 w-6 text-indigo-500" />
          <span className="font-bold tracking-tight text-lg">HIGH-SCORE</span>
        </Link>

        <div className="flex items-center space-x-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          ) : user ? (
            
            <DropdownMenu>
                <LogGameButton />
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-zinc-800 p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-zinc-900 text-zinc-50">
                      {username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 border-zinc-800 bg-zinc-950 text-zinc-50" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{username}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/profile/${username}`}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem className="cursor-pointer text-red-400" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex space-x-2">
              <Button asChild variant="ghost" className="text-zinc-300"><Link href="/login">Log In</Link></Button>
              <Button asChild className="bg-zinc-50 text-zinc-950"><Link href="/signup">Sign Up</Link></Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
// src/app/login/page.tsx
import { getAuthBackdropGames } from "@/lib/igdb/auth-backdrop"
import { LoginForm } from "./LoginForm"

export const metadata = { title: "Sign In — HIGH-SCORE" }

export default async function LoginPage() {
  const backdropGames = await getAuthBackdropGames()
  return <LoginForm backdropGames={backdropGames} />
}

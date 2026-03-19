// src/app/signup/page.tsx
import { getAuthBackdropGames } from "@/lib/igdb/auth-backdrop"
import { SignupForm } from "./SignupForm"

export const metadata = { title: "Create Account — HIGH-SCORE" }

export default async function SignupPage() {
  const backdropGames = await getAuthBackdropGames()
  return <SignupForm backdropGames={backdropGames} />
}

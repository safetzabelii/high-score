// src/app/login/page.tsx
import { Suspense } from "react"
import { LoginForm } from "./LoginForm"

export const metadata = { title: "Sign In — HIGH-SCORE" }

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

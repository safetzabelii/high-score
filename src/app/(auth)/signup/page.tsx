"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Gamepad2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";

const formSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters." })
      .max(20, { message: "Username must be 20 characters or fewer." })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Only letters, numbers, and underscores allowed.",
      }),
    email: z.string().email({ message: "Enter a valid email address." }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter.",
      })
      .regex(/[0-9]/, {
        message: "Password must contain at least one number.",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof formSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [emailSent, setEmailSent] = useState(false);

  // Fast client-side guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/");
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignUpFormValues) {
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { username: values.username },
        // After email confirmation, redirect back to the app
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Supabase sends a confirmation email by default.
    // If you have email confirmation disabled in your project settings,
    // the user is logged in immediately — router.push('/') will work.
    setEmailSent(true);
    setIsLoading(false);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-50">Check your inbox</h2>
            <p className="mt-2 text-sm text-zinc-400">
              We&apos;ve sent you a confirmation email. Click the link inside to
              activate your account.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800">
            <Gamepad2 className="h-7 w-7 text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Create an account
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Join the community today
            </p>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="username"
              render={({
                field,
              }: {
                field: ControllerRenderProps<SignUpFormValues, "username">;
              }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="cool_gamer99"
                      autoComplete="username"
                      className="border-zinc-700 bg-zinc-950 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-500"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-zinc-600 text-xs">
                    3–20 characters. Letters, numbers, underscores only.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({
                field,
              }: {
                field: ControllerRenderProps<SignUpFormValues, "email">;
              }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="border-zinc-700 bg-zinc-950 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({
                field,
              }: {
                field: ControllerRenderProps<SignUpFormValues, "password">;
              }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="border-zinc-700 bg-zinc-950 text-zinc-50 pr-10 focus-visible:ring-zinc-500"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription className="text-zinc-600 text-xs">
                    8+ characters, one uppercase letter, one number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({
                field,
              }: {
                field: ControllerRenderProps<SignUpFormValues, "confirmPassword">;
              }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Confirm password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="border-zinc-700 bg-zinc-950 text-zinc-50 pr-10 focus-visible:ring-zinc-500"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200 transition-colors font-medium"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Form>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-zinc-300 hover:text-zinc-50 transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
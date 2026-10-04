"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, getSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Mail, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  loginSchema, otpRequestSchema, type LoginInput, type ForgotPasswordInput,
} from "@/lib/validations/auth"
import { safeInternalPath } from "@/lib/safe-redirect"
import { savePendingOtp, readPendingOtp, postLoginDestination } from "@/lib/auth/login-flow"

type Mode = "email" | "password"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeInternalPath(searchParams.get("callbackUrl"))
  const registered = searchParams.get("registered") === "1"
  const passwordReset = searchParams.get("reset") === "1"
  const [mode, setMode] = useState<Mode>(passwordReset ? "password" : "email")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  // Passwordless (email code) form
  const emailForm = useForm<ForgotPasswordInput>({ resolver: zodResolver(otpRequestSchema) })
  // Email + password form
  const passwordForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  // "Change email" from the verify page → prefill the address
  useEffect(() => {
    const pending = readPendingOtp()
    if (pending) emailForm.setValue("email", pending.email)
  }, [emailForm])

  function switchMode(next: Mode) {
    setError("")
    if (next === "password") passwordForm.setValue("email", emailForm.getValues("email") ?? "")
    else emailForm.setValue("email", passwordForm.getValues("email") ?? "")
    setMode(next)
  }

  async function onRequestCode(data: ForgotPasswordInput) {
    setError("")
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? "Something went wrong. Please try again."); return }
      savePendingOtp({
        email: data.email,
        sentAt: Date.now(),
        expiresInSeconds: json.expiresInSeconds,
        resendCooldownSeconds: json.resendCooldownSeconds,
      })
      const qs = callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
      router.push(`/login/verify-otp${qs}`)
    } catch {
      setError("Something went wrong. Please try again.")
    }
  }

  async function onPasswordSubmit(data: LoginInput) {
    setError("")
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl: "/",
    })
    const hasError = result?.error && result.error !== "undefined"
    if (hasError || !result?.ok) {
      setError("Invalid email or password. Please try again.")
      return
    }

    const session = await getSession()
    router.push(postLoginDestination(session?.user?.role as string | undefined, callbackUrl))
    router.refresh()
  }

  const emailErrors = emailForm.formState.errors
  const pwErrors = passwordForm.formState.errors

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your Crunchy Bingebite account
        </p>
      </div>

      {/* Success messages */}
      {registered && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/25 bg-green-500/8 px-4 py-3 mb-5">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-500 font-medium">
            Account created! Sign in to get started.
          </p>
        </div>
      )}

      {passwordReset && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/25 bg-green-500/8 px-4 py-3 mb-5">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-500 font-medium">
            Password updated! Sign in with your new password.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 mb-5">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {mode === "email" ? (
        /* ─── Passwordless: email code ─────────────────────────────────── */
        <form onSubmit={emailForm.handleSubmit(onRequestCode)} className="space-y-5" noValidate>
          <div className="input-group">
            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!emailErrors.email}
              aria-describedby={emailErrors.email ? "email-error" : "email-hint"}
              {...emailForm.register("email")}
            />
            {emailErrors.email ? (
              <p id="email-error" className="text-xs text-destructive" role="alert">
                {emailErrors.email.message}
              </p>
            ) : (
              <p id="email-hint" className="text-xs text-muted-foreground">
                We&apos;ll email you a 6-digit code — no password needed.
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="brand"
            className="w-full h-11 font-semibold"
            disabled={emailForm.formState.isSubmitting}
          >
            {emailForm.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending code…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Continue with Email
              </>
            )}
          </Button>
        </form>
      ) : (
        /* ─── Email + password ─────────────────────────────────────────── */
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5" noValidate>
          {/* Email */}
          <div className="input-group">
            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!pwErrors.email}
              aria-describedby={pwErrors.email ? "email-error" : undefined}
              {...passwordForm.register("email")}
            />
            {pwErrors.email && (
              <p id="email-error" className="text-xs text-destructive" role="alert">
                {pwErrors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="input-group">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                autoFocus
                className="pr-10"
                aria-invalid={!!pwErrors.password}
                aria-describedby={pwErrors.password ? "password-error" : undefined}
                {...passwordForm.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwErrors.password && (
              <p id="password-error" className="text-xs text-destructive" role="alert">
                {pwErrors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="brand"
            className="w-full h-11 font-semibold"
            disabled={passwordForm.formState.isSubmitting}
          >
            {passwordForm.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      )}

      {/* Other sign-in methods — add future providers here */}
      <div className="my-6 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        {mode === "email" ? (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={() => switchMode("password")}
          >
            <KeyRound className="h-4 w-4" />
            Login with Password
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={() => switchMode("email")}
          >
            <Mail className="h-4 w-4" />
            Continue with Email Code
          </Button>
        )}
      </div>

      {mode === "email" && (
        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot Password?
          </Link>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Create one free
        </Link>
      </div>
    </div>
  )
}

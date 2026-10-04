"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Check, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { resetPasswordSchema, resetTokenSchema, type ResetPasswordInput } from "@/lib/validations/auth"

// Mirrors passwordSchema in lib/validations/auth.ts
const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter",  test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number",            test: (v: string) => /[0-9]/.test(v) },
]

// Token survives a refresh via sessionStorage: tab-scoped, cleared when the tab
// closes, never synced or written to history (unlike the URL). It is removed as
// soon as the flow ends. The server still validates it on submit.
const STORAGE_KEY = "bb-reset-token"

function storeToken(value: string | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable (private mode etc.) — refresh just shows "expired"
  }
}

function readStoredToken(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    return value && resetTokenSchema.safeParse(value).success ? value : null
  } catch {
    return null
  }
}

interface Props {
  token: string | null
  canResume: boolean
}

export function ResetPasswordForm({ token: initialToken, canResume }: Props) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [status, setStatus] = useState<"checking" | "form" | "invalid" | "success">(
    initialToken ? "form" : canResume ? "checking" : "invalid"
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })
  const password = watch("password") ?? ""

  useEffect(() => {
    // Remove the token from the address bar / history once it's been read
    if (window.location.search) window.history.replaceState(null, "", "/reset-password")

    if (initialToken) {
      storeToken(initialToken)
    } else if (canResume) {
      const stored = readStoredToken()
      setToken(stored)
      setStatus(stored ? "form" : "invalid")
    } else {
      storeToken(null) // a bad/expired link replaces any earlier stored token
    }
  }, [initialToken, canResume])

  useEffect(() => {
    if (status === "invalid" || status === "success") storeToken(null)
  }, [status])

  async function onSubmit(data: ResetPasswordInput) {
    setError("")
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password, confirmPassword: data.confirmPassword }),
      })
      const json = await res.json()
      if (json.success) { setStatus("success"); return }
      if (json.code === "INVALID_TOKEN") { setStatus("invalid"); return }
      setError(json.error ?? "Could not reset password. Please try again.")
    } catch {
      setError("Could not reset password. Please try again.")
    }
  }

  if (status === "checking") {
    return (
      <div className="flex w-full justify-center py-16" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "invalid") {
    return (
      <div className="w-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 mb-6">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Link invalid or expired</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          This password reset link is no longer valid. Links expire after 30 minutes and can
          only be used once.
        </p>
        <Button asChild variant="brand" className="w-full h-11 font-semibold mt-8">
          <Link href="/forgot-password">Request a New Link</Link>
        </Button>
        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="w-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 mb-6">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Your password has been changed and you&apos;ve been signed out of all devices.
          Sign in with your new password to continue.
        </p>
        <Button asChild variant="brand" className="w-full h-11 font-semibold mt-8">
          <Link href="/login?reset=1">Sign In</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15 mb-6">
          <KeyRound className="h-6 w-6 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a strong password you haven&apos;t used before.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 mb-5">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* New password */}
        <div className="input-group">
          <Label htmlFor="password" className="text-sm font-medium">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              autoComplete="new-password"
              autoFocus
              className="pr-10"
              aria-invalid={!!errors.password}
              aria-describedby="password-rules"
              {...register("password")}
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

          {/* Strength / requirements */}
          <div id="password-rules" className="mt-2 space-y-2">
            <div className="flex gap-1.5" aria-hidden>
              {RULES.map((rule, i) => {
                const passed = RULES.filter((r) => r.test(password)).length
                return (
                  <div
                    key={rule.label}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < passed
                        ? passed === RULES.length ? "bg-green-500" : "bg-brand-500"
                        : "bg-border"
                    )}
                  />
                )
              })}
            </div>
            <ul className="space-y-1">
              {RULES.map((rule) => {
                const ok = rule.test(password)
                return (
                  <li
                    key={rule.label}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors",
                      ok ? "text-green-500" : "text-muted-foreground"
                    )}
                  >
                    <Check className={cn("h-3 w-3", ok ? "opacity-100" : "opacity-30")} />
                    {rule.label}
                  </li>
                )
              })}
            </ul>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="input-group">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              className="pr-10"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive" role="alert">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="brand"
          className="w-full h-11 font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting password…
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300 transition-colors">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}

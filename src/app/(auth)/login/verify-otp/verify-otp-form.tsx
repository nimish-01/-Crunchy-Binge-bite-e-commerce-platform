"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, getSession, signOut } from "next-auth/react"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MailCheck, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OtpInput } from "@/components/auth/otp-input"
import { safeInternalPath } from "@/lib/safe-redirect"
import {
  readPendingOtp, savePendingOtp, clearPendingOtp, maskEmail, postLoginDestination,
  type PendingOtp,
} from "@/lib/auth/login-flow"

type Status = "idle" | "verifying" | "success"
// The server answers every failed code with the same generic "invalid" so it
// can't be used to probe for accounts. "expired" and "too_many" are derived
// locally from the countdown and this tab's attempt count.
type Problem = "invalid" | "expired" | "too_many" | "rate_limited" | "network" | null

const MAX_ATTEMPTS = 5 // mirrors OTP_MAX_ATTEMPTS on the server

const PROBLEM_TEXT: Record<Exclude<Problem, null>, string> = {
  invalid:      "That code is incorrect or has expired. Use the code from the most recent email, or request a new one.",
  expired:      "This code has expired. Request a new code to continue.",
  too_many:     "Too many attempts with this code. Request a new code to continue.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  network:      "Something went wrong. Check your connection and try again.",
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeInternalPath(searchParams.get("callbackUrl"))

  const [pending, setPending] = useState<PendingOtp | null>(null)
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [problem, setProblem] = useState<Problem>(null)
  const [resending, setResending] = useState(false)
  const [resentNotice, setResentNotice] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // No pending verification in this tab → back to login
  useEffect(() => {
    const p = readPendingOtp()
    if (!p) { router.replace("/login"); return }
    setPending(p)
  }, [router])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const expiresIn = pending
    ? Math.max(0, Math.ceil((pending.sentAt + pending.expiresInSeconds * 1000 - now) / 1000))
    : 0
  const resendIn = pending
    ? Math.max(0, Math.ceil((pending.sentAt + pending.resendCooldownSeconds * 1000 - now) / 1000))
    : 0
  const expired = !!pending && expiresIn === 0
  const outOfAttempts = failedAttempts >= MAX_ATTEMPTS
  const locked = outOfAttempts || expired
  const busy = status !== "idle"

  const verify = useCallback(async (value: string) => {
    if (!pending || value.length !== 6 || status !== "idle") return
    setStatus("verifying")
    setProblem(null)
    setResentNotice(false)
    try {
      const result = await signIn("email-otp", {
        email: pending.email,
        code: value,
        redirect: false,
      })
      const hasError = result?.error && result.error !== "undefined"
      if (hasError || !result?.ok) {
        if (result?.code === "rate_limited") {
          setProblem("rate_limited")
        } else {
          const attempts = failedAttempts + 1
          setFailedAttempts(attempts)
          setProblem(attempts >= MAX_ATTEMPTS ? "too_many" : "invalid")
        }
        setCode("")
        setStatus("idle")
        return
      }

      const session = await getSession()
      const role = session?.user?.role as string | undefined
      if (role !== "CUSTOMER") {
        // Defence in depth — the server only ever issues customer sessions here
        await signOut({ redirect: false })
        setProblem("invalid")
        setStatus("idle")
        return
      }

      clearPendingOtp()
      setStatus("success")
      router.push(postLoginDestination(role, callbackUrl))
      router.refresh()
    } catch {
      setProblem("network")
      setStatus("idle")
    }
  }, [pending, status, failedAttempts, callbackUrl, router])

  async function resend() {
    if (!pending || resendIn > 0 || resending) return
    setResending(true)
    setProblem(null)
    setResentNotice(false)
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email }),
      })
      const json = await res.json()
      if (!json.success) {
        setProblem(res.status === 429 ? "rate_limited" : "network")
        return
      }
      const next: PendingOtp = {
        email: pending.email,
        sentAt: Date.now(),
        expiresInSeconds: json.expiresInSeconds,
        resendCooldownSeconds: json.resendCooldownSeconds,
      }
      savePendingOtp(next)
      setPending(next)
      setNow(Date.now())
      setCode("")
      setFailedAttempts(0)
      setResentNotice(true)
    } catch {
      setProblem("network")
    } finally {
      setResending(false)
    }
  }

  if (!pending) {
    return (
      <div className="flex w-full justify-center py-16" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="w-full text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 mb-6">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">You&apos;re signed in</h1>
        <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting…
        </p>
      </div>
    )
  }

  const shownProblem: Problem = expired && problem !== "too_many" ? "expired" : problem

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15 mb-6">
          <MailCheck className="h-6 w-6 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground mt-2">We sent a verification code to:</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold break-all">{maskEmail(pending.email)}</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
            aria-label="Change email address"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Link>
        </div>
      </div>

      {shownProblem && (
        <div
          className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 mb-5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{PROBLEM_TEXT[shownProblem]}</p>
        </div>
      )}

      {resentNotice && !shownProblem && (
        <div
          className="flex items-center gap-3 rounded-xl border border-green-500/25 bg-green-500/8 px-4 py-3 mb-5"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-500 font-medium">If your account is eligible, a new code is on its way.</p>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); verify(code) }}
        className="space-y-5"
        noValidate
      >
        <OtpInput
          value={code}
          onChange={(v) => { setCode(v); if (problem === "invalid") setProblem(null) }}
          onComplete={verify}
          disabled={busy || locked}
          invalid={problem === "invalid"}
          autoFocus
        />

        <p className="text-xs text-muted-foreground text-center" aria-live="polite">
          {expired ? "Code expired" : <>Code expires in <span className="font-semibold tabular-nums">{formatSeconds(expiresIn)}</span></>}
        </p>

        <Button
          type="submit"
          variant="brand"
          className="w-full h-11 font-semibold"
          disabled={busy || locked || code.length !== 6}
        >
          {status === "verifying" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify & Sign In"
          )}
        </Button>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={resend}
          disabled={resendIn > 0 || resending || busy}
        >
          {resending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : resendIn > 0 ? (
            <span className="tabular-nums">Resend code in {formatSeconds(resendIn)}</span>
          ) : (
            "Resend Code"
          )}
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" />
            Change Email
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Didn&apos;t get it? Check your spam folder, or{" "}
        <Link href="/login" className="underline underline-offset-2 hover:text-foreground transition-colors">
          try another sign-in method
        </Link>
        .
      </p>
    </div>
  )
}

import type { Metadata } from "next"
import { resetTokenSchema } from "@/lib/validations/auth"
import { isResetTokenValid } from "@/lib/services/password-reset"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password",
  // Keep the token out of Referer headers and search indexes
  referrer: "no-referrer",
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams
  const parsed = resetTokenSchema.safeParse(token)

  let valid = false
  if (parsed.success) {
    try {
      valid = await isResetTokenValid(parsed.data)
    } catch {
      valid = false
    }
  }

  return (
    <ResetPasswordForm
      token={valid && parsed.success ? parsed.data : null}
      // No token in the URL at all (e.g. a refresh after the token was
      // stripped) → the form may resume from the tab's session storage
      canResume={token === undefined}
    />
  )
}

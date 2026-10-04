import { Suspense } from "react"
import type { Metadata } from "next"
import { VerifyOtpForm } from "./verify-otp-form"

export const metadata: Metadata = {
  title: "Verify Code",
  robots: { index: false, follow: false },
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  )
}

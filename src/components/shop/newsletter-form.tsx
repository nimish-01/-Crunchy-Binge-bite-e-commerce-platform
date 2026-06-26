"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function NewsletterForm() {
  const [email, setEmail]         = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-500 font-medium py-2">
        <CheckCircle2 className="h-5 w-5" />
        <span>You&apos;re subscribed! We&apos;ll be in touch.</span>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto"
      onSubmit={handleSubmit}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="flex-1 h-10 px-4 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
        aria-label="Email address for newsletter"
      />
      <Button type="submit" variant="brand" size="default">
        Subscribe
      </Button>
    </form>
  )
}

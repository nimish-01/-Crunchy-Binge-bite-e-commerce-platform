"use client"

import { useState } from "react"
import { Copy, Check, MessageCircle } from "lucide-react"

interface Props {
  referralCode: string
  referralLink: string
}

export default function ReferralShare({ referralCode, referralLink }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappMsg = encodeURIComponent(
    `Hey! Try Binge Bite for healthy snacks. Use my referral link to get bonus points: ${referralLink}`,
  )

  return (
    <div className="space-y-3">
      {/* Link display */}
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted text-sm font-mono text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
          {referralLink}
        </div>
        <button
          onClick={copyLink}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? "bg-green-500/15 text-green-600"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <a
          href={`https://wa.me/?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=Join Binge Bite&body=Use my referral link: ${referralLink}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
        >
          Email Invite
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        Code: <span className="font-mono font-bold text-brand-400">{referralCode.slice(0, 8).toUpperCase()}</span>
      </p>
    </div>
  )
}

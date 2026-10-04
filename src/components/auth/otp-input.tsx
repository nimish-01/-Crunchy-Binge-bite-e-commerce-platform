"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
}

export function OtpInput({
  value, onChange, onComplete, length = 6, disabled, invalid, autoFocus,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? "")

  function focus(index: number) {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus()
  }

  function commit(next: string) {
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "")
    if (!typed) return
    // Supports typing one digit or autofill/paste of several into one box
    const next = (value.slice(0, index) + typed).slice(0, length)
    commit(next)
    focus(next.length)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (digits[index]) {
        onChange(value.slice(0, index))
      } else if (index > 0) {
        onChange(value.slice(0, index - 1))
        focus(index - 1)
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); focus(index - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); focus(index + 1)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasted) return
    e.preventDefault()
    commit(pasted)
    focus(pasted.length)
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="Verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-12 w-full min-w-0 max-w-[3.25rem] rounded-xl border bg-background text-center text-xl font-semibold tabular-nums",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
            "disabled:opacity-50 sm:h-14",
            invalid ? "border-destructive/60" : digit ? "border-brand-500/50" : "border-input"
          )}
        />
      ))}
    </div>
  )
}

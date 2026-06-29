"use client"

import { Moon, Sun, UtensilsCrossed } from "lucide-react"
import { useTheme, type Theme } from "@/contexts/theme-context"
import { cn } from "@/lib/utils"

const THEMES: { value: Theme; Icon: React.ElementType; label: string }[] = [
  { value: "dark",   Icon: Moon,             label: "Dark"   },
  { value: "light",  Icon: Sun,              label: "Light"  },
  { value: "foodie", Icon: UtensilsCrossed,  label: "Foodie" },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center rounded-full border border-border bg-background/50 backdrop-blur p-0.5 gap-0.5"
    >
      {THEMES.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          aria-pressed={theme === value}
          className={cn(
            "rounded-full p-1.5 transition-all duration-200",
            theme === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{label} mode</span>
        </button>
      ))}
    </div>
  )
}

import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "3xl": "1.5rem",
        "2xl": "1rem",
        xl:  "var(--radius-xl)",
        lg:  "var(--radius)",
        md:  "calc(var(--radius) - 2px)",
        sm:  "calc(var(--radius) - 4px)",
        xs:  "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        "brand-sm":  "0 2px 8px -2px rgba(245,158,11,0.15)",
        "brand-md":  "0 4px 20px -4px rgba(245,158,11,0.25)",
        "brand-lg":  "0 8px 40px -8px rgba(245,158,11,0.35)",
        "elevation-1": "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
        "elevation-2": "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.09)",
        "elevation-3": "0 8px 24px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.1)",
        "elevation-4": "0 16px 48px rgba(0,0,0,0.22), 0 8px 16px rgba(0,0,0,0.12)",
        "inner-brand": "inset 0 2px 4px rgba(245,158,11,0.1)",
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      transitionTimingFunction: {
        "spring":       "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "snappy":       "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "smooth":       "cubic-bezier(0.4, 0, 0.2, 1)",
        "decelerate":   "cubic-bezier(0, 0, 0.2, 1)",
        "accelerate":   "cubic-bezier(0.4, 0, 1, 1)",
      },
      transitionDuration: {
        "50":  "50ms",
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
        "600": "600ms",
        "800": "800ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to:   { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to:   { height: "0", opacity: "0" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(0)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to:   { transform: "translateY(0)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to:   { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-16px)", opacity: "0" },
          to:   { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.92)", opacity: "0" },
          to:   { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to:   { transform: "scale(0.92)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-brand": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.4)" },
          "50%":       { boxShadow: "0 0 0 8px rgba(245,158,11,0)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-4px)" },
        },
        "count-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to:   { transform: "translateY(0)", opacity: "1" },
        },
        "skeleton": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down":   "accordion-down 0.2s ease-out",
        "accordion-up":     "accordion-up 0.2s ease-out",
        "slide-in":         "slide-in-from-right 0.3s ease-out",
        "slide-in-left":    "slide-in-from-left 0.3s ease-out",
        "slide-in-bottom":  "slide-in-from-bottom 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up":         "slide-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "slide-down":       "slide-down 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "fade-in":          "fade-in 0.25s ease-out",
        "scale-in":         "scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "scale-out":        "scale-out 0.15s ease-in",
        shimmer:            "shimmer 2s infinite",
        "pulse-brand":      "pulse-brand 2s infinite",
        "spin-slow":        "spin-slow 3s linear infinite",
        "bounce-subtle":    "bounce-subtle 2s ease-in-out infinite",
        skeleton:           "skeleton 2s ease infinite",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "brand-gradient":       "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
        "brand-gradient-soft":  "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.15) 100%)",
        "skeleton-gradient":    "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--accent)) 50%, hsl(var(--muted)) 75%)",
        "shine":                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      screens: {
        xs: "380px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config

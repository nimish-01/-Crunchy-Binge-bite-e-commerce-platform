"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export type Theme = "dark" | "light" | "foodie"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
})

function applyTheme(theme: Theme, transition = false) {
  const root = document.documentElement
  if (transition) {
    root.classList.add("theme-transitioning")
    setTimeout(() => root.classList.remove("theme-transitioning"), 350)
  }
  root.classList.remove("dark", "light", "foodie")
  root.classList.add(theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    const stored = localStorage.getItem("bb-theme") as Theme | null
    const resolved = stored && ["dark", "light", "foodie"].includes(stored) ? stored : "dark"
    setThemeState(resolved)
    applyTheme(resolved)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("bb-theme", t)
    applyTheme(t, true)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

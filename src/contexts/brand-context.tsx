"use client"

import { createContext, useContext, type ReactNode } from "react"

/** Logo URLs managed from Admin → Settings → Brand Logo (empty = not set). */
export interface Brand {
  logoUrl: string
  logoLightUrl: string
  logoMarkUrl: string
}

const EMPTY: Brand = { logoUrl: "", logoLightUrl: "", logoMarkUrl: "" }

const BrandContext = createContext<Brand>(EMPTY)

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand(): Brand {
  return useContext(BrandContext)
}

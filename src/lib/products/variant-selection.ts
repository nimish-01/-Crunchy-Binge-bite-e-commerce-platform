// Single source of truth for "which variant represents this product" across
// listing, homepage, search, and cards. Prefer the admin-chosen default;
// fall back to the cheapest active variant if none is set (or none active).

interface SelectableVariant {
  isActive: boolean
  price: number
}

export function pickDisplayVariant<T extends SelectableVariant & { isDefault?: boolean }>(
  variants: T[]
): T | undefined {
  if (variants.length === 0) return undefined
  const active = variants.filter((v) => v.isActive)
  const pool = active.length > 0 ? active : variants
  const marked = pool.find((v) => v.isDefault)
  if (marked) return marked
  return [...pool].sort((a, b) => a.price - b.price)[0]
}

export function sortVariantsForDisplay<
  T extends SelectableVariant & { isDefault?: boolean; sortOrder?: number },
>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const aDefault = a.isDefault ?? false
    const bDefault = b.isDefault ?? false
    if (aDefault !== bDefault) return aDefault ? -1 : 1
    const aSort = a.sortOrder ?? 0
    const bSort = b.sortOrder ?? 0
    if (aSort !== bSort) return aSort - bSort
    return a.price - b.price
  })
}

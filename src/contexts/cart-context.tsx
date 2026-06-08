"use client"

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react"
import type { CartItemWithDetails, CartState, Coupon } from "@/types"

type CartAction =
  | { type: "SET_CART"; payload: CartItemWithDetails[] }
  | { type: "ADD_ITEM"; payload: CartItemWithDetails }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QTY"; payload: { itemId: string; quantity: number } }
  | { type: "SET_COUPON"; payload: Coupon | null }
  | { type: "CLEAR" }

interface CartContextValue extends CartState {
  addItem: (productId: string, variantId: string, quantity?: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>
  removeCoupon: () => void
  clearCart: () => void
  isLoading: boolean
}

const DELIVERY_CHARGE = 49
const FREE_DELIVERY_THRESHOLD = 499

function calcTotals(items: CartItemWithDetails[], coupon: Coupon | null) {
  const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0)
  let discountAmount = 0
  if (coupon) {
    if (subtotal >= coupon.minOrderValue) {
      if (coupon.type === "FLAT") discountAmount = Math.min(coupon.value, coupon.maxDiscount ?? Infinity)
      else if (coupon.type === "PERCENTAGE") discountAmount = Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount ?? Infinity)
      else if (coupon.type === "FREE_SHIPPING") discountAmount = 0
    }
  }
  const deliveryCharge = coupon?.type === "FREE_SHIPPING" || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE
  const total = subtotal - discountAmount + deliveryCharge
  return { subtotal, discountAmount, deliveryCharge, total }
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_CART": {
      const t = calcTotals(action.payload, state.coupon)
      return { ...state, items: action.payload, ...t, itemCount: action.payload.reduce((s, i) => s + i.quantity, 0) }
    }
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.variantId === action.payload.variantId)
      const items = existing
        ? state.items.map((i) => i.variantId === action.payload.variantId ? { ...i, quantity: i.quantity + action.payload.quantity } : i)
        : [...state.items, action.payload]
      const t = calcTotals(items, state.coupon)
      return { ...state, items, ...t, itemCount: items.reduce((s, i) => s + i.quantity, 0) }
    }
    case "REMOVE_ITEM": {
      const items = state.items.filter((i) => i.id !== action.payload)
      const t = calcTotals(items, state.coupon)
      return { ...state, items, ...t, itemCount: items.reduce((s, i) => s + i.quantity, 0) }
    }
    case "UPDATE_QTY": {
      const items = state.items.map((i) => i.id === action.payload.itemId ? { ...i, quantity: action.payload.quantity } : i)
      const t = calcTotals(items, state.coupon)
      return { ...state, items, ...t, itemCount: items.reduce((s, i) => s + i.quantity, 0) }
    }
    case "SET_COUPON": {
      const t = calcTotals(state.items, action.payload)
      return { ...state, coupon: action.payload, ...t }
    }
    case "CLEAR":
      return { items: [], subtotal: 0, total: 0, discountAmount: 0, deliveryCharge: 0, coupon: null, itemCount: 0 }
    default:
      return state
  }
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [], subtotal: 0, total: 0, discountAmount: 0, deliveryCharge: 0, coupon: null, itemCount: 0,
  })
  const [isLoading, setIsLoading] = React.useState(false)

  // Load cart on mount
  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => { if (data.success) dispatch({ type: "SET_CART", payload: data.data?.items ?? [] }) })
      .catch(() => {})
  }, [])

  const addItem = useCallback(async (productId: string, variantId: string, quantity = 1) => {
    setIsLoading(true)
    try {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, variantId, quantity }) })
      const data = await r.json()
      if (data.success) dispatch({ type: "SET_CART", payload: data.data.items })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeItem = useCallback(async (itemId: string) => {
    setIsLoading(true)
    try {
      await fetch(`/api/cart/${itemId}`, { method: "DELETE" })
      dispatch({ type: "REMOVE_ITEM", payload: itemId })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(itemId); return }
    setIsLoading(true)
    try {
      await fetch(`/api/cart/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) })
      dispatch({ type: "UPDATE_QTY", payload: { itemId, quantity } })
    } finally {
      setIsLoading(false)
    }
  }, [removeItem])

  const applyCoupon = useCallback(async (code: string) => {
    const r = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, subtotal: state.subtotal }) })
    const data = await r.json()
    if (data.success) { dispatch({ type: "SET_COUPON", payload: data.data.coupon }); return { success: true } }
    return { success: false, error: data.error ?? "Invalid coupon" }
  }, [state.subtotal])

  const removeCoupon = useCallback(() => dispatch({ type: "SET_COUPON", payload: null }), [])
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), [])

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, updateQuantity, applyCoupon, removeCoupon, clearCart, isLoading }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}

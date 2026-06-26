"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  customer: {
    id: string
    isActive: boolean
    loyaltyPoints: number
    wallet: { balance: number } | null
  }
}

export default function CustomerActions({ customer }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [walletAmount, setWalletAmount] = useState("")
  const [walletDesc, setWalletDesc]     = useState("")
  const [walletType, setWalletType]     = useState<"CREDIT" | "DEBIT">("CREDIT")
  const [loyaltyPts, setLoyaltyPts]     = useState("")
  const [loyaltyDesc, setLoyaltyDesc]   = useState("")
  const [msg, setMsg] = useState("")

  async function toggleSuspend() {
    setLoading(true)
    await fetch(`/api/admin/customers/${customer.id}/suspend`, { method: "POST" })
    router.refresh()
    setLoading(false)
  }

  async function submitWallet(e: React.FormEvent) {
    e.preventDefault()
    if (!walletAmount || !walletDesc) return
    setLoading(true)
    const res = await fetch(`/api/admin/customers/${customer.id}/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(walletAmount), description: walletDesc, type: walletType }),
    })
    const data = await res.json()
    setMsg(data.success ? `Wallet updated. New balance: ₹${data.balance.toFixed(0)}` : data.error)
    setWalletAmount("")
    setWalletDesc("")
    setLoading(false)
    router.refresh()
  }

  async function submitLoyalty(e: React.FormEvent) {
    e.preventDefault()
    if (!loyaltyPts || !loyaltyDesc) return
    setLoading(true)
    const res = await fetch(`/api/admin/customers/${customer.id}/loyalty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: parseInt(loyaltyPts), description: loyaltyDesc }),
    })
    const data = await res.json()
    setMsg(data.success ? `Loyalty updated. Points: ${data.loyaltyPoints}` : data.error)
    setLoyaltyPts("")
    setLoyaltyDesc("")
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Suspend / Reactivate */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium mb-3">Account Status</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Currently: <span className={customer.isActive ? "text-green-500" : "text-red-500"}>
            {customer.isActive ? "Active" : "Suspended"}
          </span>
        </p>
        <button
          onClick={toggleSuspend}
          disabled={loading}
          className={`w-full py-2 text-sm rounded-lg font-medium transition-colors ${
            customer.isActive
              ? "bg-red-500/15 text-red-600 hover:bg-red-500/25"
              : "bg-green-500/15 text-green-600 hover:bg-green-500/25"
          }`}
        >
          {customer.isActive ? "Suspend Account" : "Reactivate Account"}
        </button>
      </div>

      {/* Wallet */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium mb-3">Wallet (₹{(customer.wallet?.balance ?? 0).toFixed(0)})</h3>
        <form onSubmit={submitWallet} className="space-y-2">
          <select
            value={walletType}
            onChange={(e) => setWalletType(e.target.value as "CREDIT" | "DEBIT")}
            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
          >
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
          </select>
          <input
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            placeholder="Amount (₹)"
            min="1"
            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
          />
          <input
            value={walletDesc}
            onChange={(e) => setWalletDesc(e.target.value)}
            placeholder="Description"
            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 text-sm bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Loyalty */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium mb-3">Loyalty ({customer.loyaltyPoints} pts)</h3>
        <form onSubmit={submitLoyalty} className="space-y-2">
          <input
            type="number"
            value={loyaltyPts}
            onChange={(e) => setLoyaltyPts(e.target.value)}
            placeholder="Points (+/-)"
            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
          />
          <input
            value={loyaltyDesc}
            onChange={(e) => setLoyaltyDesc(e.target.value)}
            placeholder="Description"
            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 text-sm bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
          >
            Adjust Points
          </button>
        </form>
      </div>

      {msg && (
        <div className="md:col-span-3 p-3 bg-green-500/10 text-green-600 text-sm rounded-lg">
          {msg}
        </div>
      )}
    </div>
  )
}

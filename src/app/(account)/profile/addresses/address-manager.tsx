"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Pencil, Trash2, Star, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

const addressSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().min(5, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().default(false),
})
type AddressFormData = z.infer<typeof addressSchema>

interface Address {
  id: string
  name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
  createdAt: Date
}

interface Props {
  initialAddresses: Address[]
}

export default function AddressManager({ initialAddresses }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [defaultingId, setDefaultingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({ resolver: zodResolver(addressSchema) })

  function openAdd() {
    setEditingId(null)
    reset({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", isDefault: false })
    setDialogOpen(true)
  }

  function openEdit(address: Address) {
    setEditingId(address.id)
    reset({
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: AddressFormData) {
    try {
      if (editingId) {
        const res = await fetch(`/api/addresses/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const result = await res.json()
        if (!result.success) throw new Error(result.error)
        toast({ title: "Address updated" })
      } else {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const result = await res.json()
        if (!result.success) throw new Error(result.error)
        toast({ title: "Address saved" })
      }
      setDialogOpen(false)
      router.refresh()
      // Refresh local list from server
      const fresh = await fetch("/api/addresses").then((r) => r.json())
      if (fresh.success) setAddresses(fresh.data.addresses)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      toast({ title: msg, variant: "destructive" })
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: "Address deleted" })
      setAddresses((prev) => prev.filter((a) => a.id !== id))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not delete address"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSetDefault(id: string) {
    setDefaultingId(id)
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: "Default address updated" })
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id }))
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not update default"
      toast({ title: msg, variant: "destructive" })
    } finally {
      setDefaultingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="brand" onClick={openAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add New Address
      </Button>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No saved addresses yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add an address to speed up checkout.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={address.isDefault ? "border-brand-500/40 bg-brand-500/5" : ""}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold">{address.name}</p>
                      {address.isDefault && (
                        <Badge variant="success" className="text-xs gap-1">
                          <Star className="h-3 w-3" />Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{address.phone}</p>
                    <p className="text-sm mt-1">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} – {address.pincode}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(address)}
                      className="gap-1"
                    >
                      <Pencil className="h-3 w-3" />Edit
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={defaultingId === address.id}
                        className="gap-1"
                      >
                        {defaultingId === address.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Star className="h-3 w-3" />}
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      disabled={deletingId === address.id}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      {deletingId === address.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Address" : "Add New Address"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update your saved address details." : "Save a new delivery address."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="Priya Sharma" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input placeholder="9876543210" maxLength={10} {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Pincode *</Label>
                <Input placeholder="560001" maxLength={6} {...register("pincode")} />
                {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Address Line 1 *</Label>
                <Input placeholder="House/Flat No., Building, Street" {...register("line1")} />
                {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Address Line 2 (Optional)</Label>
                <Input placeholder="Area, Landmark" {...register("line2")} />
              </div>

              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input placeholder="Bengaluru" {...register("city")} />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>State *</Label>
                <Input placeholder="Karnataka" {...register("state")} />
                {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  className="h-4 w-4 rounded border-border accent-brand-500"
                  {...register("isDefault")}
                />
                <Label htmlFor="isDefault" className="cursor-pointer font-normal">
                  Set as default address
                </Label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="brand" className="flex-1" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</>
                  : editingId ? "Update Address" : "Save Address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

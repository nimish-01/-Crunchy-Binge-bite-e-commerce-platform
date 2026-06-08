"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { couponSchema, type CouponInput } from "@/lib/validations/order"
import { useRouter } from "next/navigation"
import type { Coupon } from "@prisma/client"

interface Props {
  coupon?: Coupon
}

export default function CouponDialog({ coupon }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!coupon

  const today = new Date().toISOString().split("T")[0]
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0]

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          type: coupon.type as "FLAT" | "PERCENTAGE" | "FREE_SHIPPING",
          value: coupon.value,
          minOrderValue: coupon.minOrderValue,
          maxDiscount: coupon.maxDiscount ?? undefined,
          totalUsageLimit: coupon.totalUsageLimit ?? undefined,
          perUserLimit: coupon.perUserLimit,
          validFrom: new Date(coupon.validFrom).toISOString().split("T")[0],
          validUntil: new Date(coupon.validUntil).toISOString().split("T")[0],
          description: coupon.description ?? undefined,
          isActive: coupon.isActive,
        }
      : {
          type: "PERCENTAGE", value: 10, minOrderValue: 0, perUserLimit: 1,
          validFrom: today, validUntil: nextYear, isActive: true,
        },
  })

  async function onSubmit(data: CouponInput) {
    const url = isEdit ? `/api/coupons/${coupon!.id}` : "/api/coupons"
    const method = isEdit ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) { toast({ title: json.error ?? "Failed", variant: "destructive" }); return }
    toast({ title: isEdit ? "Coupon updated!" : "Coupon created!" })
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="brand"><Plus className="h-4 w-4 mr-1" />Create Coupon</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${coupon!.code}` : "Create Coupon"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                placeholder="SAVE20"
                className="uppercase"
                disabled={isEdit}
                {...register("code")}
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select
                defaultValue={watch("type")}
                onValueChange={(v) => setValue("type", v as "FLAT" | "PERCENTAGE" | "FREE_SHIPPING")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage %</SelectItem>
                  <SelectItem value="FLAT">Flat ₹</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input type="number" step="0.01" placeholder="10" {...register("value")} />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Max Discount (₹)</Label>
              <Input type="number" placeholder="Unlimited" {...register("maxDiscount")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Unlock Condition — Min. Cart Value (₹)</Label>
              <Input type="number" placeholder="0 = no minimum" {...register("minOrderValue")} />
              <p className="text-xs text-muted-foreground">
                Customers whose cart is below this amount will see &quot;Add ₹X more to unlock&quot; at checkout.
                Set 0 for no minimum.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Total Usage Limit</Label>
              <Input type="number" placeholder="Unlimited" {...register("totalUsageLimit")} />
            </div>
            <div className="space-y-1.5">
              <Label>Per User Limit</Label>
              <Input type="number" placeholder="1" {...register("perUserLimit")} />
            </div>
            <div className="space-y-1.5">
              {/* spacer */}
            </div>
            <div className="space-y-1.5">
              <Label>Valid From</Label>
              <Input type="date" {...register("validFrom")} />
            </div>
            <div className="space-y-1.5">
              <Label>Valid Until</Label>
              <Input type="date" {...register("validUntil")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="10% off on orders above ₹500" {...register("description")} />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="active"
              defaultChecked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
            <Label htmlFor="active">Active</Label>
          </div>
          <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />{isEdit ? "Saving…" : "Creating…"}</>
              : isEdit ? "Save Changes" : "Create Coupon"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

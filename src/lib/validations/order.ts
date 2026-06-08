import { z } from "zod"

export const addressSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().min(5, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
})

export const checkoutSchema = z.object({
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  paymentMethod: z.enum(["UPI", "CARD", "COD", "WALLET", "POINTS"]),
  couponCode: z.string().optional(),
  pointsToRedeem: z.coerce.number().int().min(0).default(0),
  gstRequired: z.boolean().default(false),
  giftMessage: z.string().max(200).optional(),
  notes: z.string().optional(),
}).refine((d) => d.addressId || d.address, {
  message: "Delivery address is required",
})

export const couponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  type: z.enum(["FLAT", "PERCENTAGE", "FREE_SHIPPING"]),
  value: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().positive().optional(),
  totalUsageLimit: z.coerce.number().int().positive().optional(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  validFrom: z.string(),
  validUntil: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type AddressInput = z.infer<typeof addressSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type CouponInput = z.infer<typeof couponSchema>

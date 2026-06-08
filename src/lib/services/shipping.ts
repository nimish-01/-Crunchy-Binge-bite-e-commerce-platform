/**
 * Shipping Service — abstraction layer.
 * Current implementation: static zone-based estimation.
 * To upgrade: replace with ShiprocketService.
 */

import type { ShippingEstimate } from "@/types"
import { prisma } from "@/lib/prisma"

export interface IShippingService {
  getEstimate(pincode: string): Promise<ShippingEstimate>
  isServiceable(pincode: string): Promise<boolean>
  createShipment(orderId: string, address: Record<string, string>): Promise<{ trackingId: string; awb: string }>
  getTrackingStatus(trackingId: string): Promise<{ status: string; location?: string; updatedAt: Date }>
}

// ─── Local Zone-Based Implementation ────────────────────────────────────────

class LocalShippingService implements IShippingService {
  async getEstimate(pincode: string): Promise<ShippingEstimate> {
    const zone = await prisma.deliveryZone.findFirst({
      where: { pincodes: { has: pincode }, isActive: true },
    })

    if (!zone) {
      return {
        minDays: 5,
        maxDays: 7,
        charge: 99,
        freeAbove: 999,
        codAvailable: false,
      }
    }

    return {
      minDays: zone.estimatedDaysMin,
      maxDays: zone.estimatedDaysMax,
      charge: zone.deliveryCharge,
      freeAbove: zone.freeDeliveryThreshold,
      codAvailable: zone.codEnabled,
    }
  }

  async isServiceable(pincode: string): Promise<boolean> {
    const zone = await prisma.deliveryZone.findFirst({
      where: { pincodes: { has: pincode }, isActive: true },
    })
    // Default serviceable — remove this if strict pincode enforcement is needed
    return !!zone || pincode.length === 6
  }

  async createShipment(orderId: string, _address: Record<string, string>): Promise<{ trackingId: string; awb: string }> {
    // Mock — return fake tracking
    return {
      trackingId: `MOCK_TRK_${orderId}`,
      awb: `AWB${Date.now()}`,
    }
  }

  async getTrackingStatus(trackingId: string): Promise<{ status: string; location?: string; updatedAt: Date }> {
    return {
      status: "In Transit",
      location: "Sorting Facility",
      updatedAt: new Date(),
    }
  }
}

// ─── Future: Shiprocket Implementation ──────────────────────────────────────
// class ShiprocketService implements IShippingService { ... }

export const shippingService: IShippingService = new LocalShippingService()

import type { UserRole } from "@prisma/client"

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  CUSTOMER: "CUSTOMER",
} as const

// Role hierarchy — higher index = more access
const ROLE_HIERARCHY: UserRole[] = [
  "CUSTOMER",
  "INVENTORY_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
]

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole)
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN"
}

export function isInventoryManager(role: UserRole): boolean {
  return role === "INVENTORY_MANAGER" || isAdmin(role)
}

export function canManageProducts(role: UserRole): boolean {
  return isAdmin(role)
}

export function canManageOrders(role: UserRole): boolean {
  return isAdmin(role)
}

export function canManageCustomers(role: UserRole): boolean {
  return isAdmin(role)
}

export function canManageInventory(role: UserRole): boolean {
  return isInventoryManager(role)
}

export function canManageRoles(role: UserRole): boolean {
  return isSuperAdmin(role)
}

export function canViewInventoryReports(role: UserRole): boolean {
  return isInventoryManager(role)
}

export function canViewFinancialReports(role: UserRole): boolean {
  return isAdmin(role)
}

export function canManagePaymentConfig(role: UserRole): boolean {
  return isSuperAdmin(role)
}

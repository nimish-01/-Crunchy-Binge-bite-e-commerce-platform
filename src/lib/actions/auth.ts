"use server"

import { signOut } from "@/auth"

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}

export async function adminLogoutAction() {
  await signOut({ redirectTo: "/admin/login" })
}

export async function inventoryLogoutAction() {
  await signOut({ redirectTo: "/inventory/login" })
}

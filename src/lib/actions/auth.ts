"use server"

import { signOut } from "@/auth"

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}

export async function logoutAdminAction() {
  await signOut({ redirectTo: "/admin/login" })
}

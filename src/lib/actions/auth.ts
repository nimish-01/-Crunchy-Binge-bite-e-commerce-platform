"use server"

import { redirect } from "next/navigation"
import { signOut } from "@/auth"

// signOut({ redirectTo }) makes Auth.js build an ABSOLUTE redirect from
// AUTH_URL/NEXTAUTH_URL, which sends users to the wrong origin whenever that
// env var doesn't match the domain being served. Clear the session without
// redirecting, then redirect to a fixed, relative internal path so the browser
// always stays on the origin it is already on.

export async function logoutAction() {
  await signOut({ redirect: false })
  redirect("/")
}

export async function adminLogoutAction() {
  await signOut({ redirect: false })
  redirect("/admin/login")
}

export async function inventoryLogoutAction() {
  await signOut({ redirect: false })
  redirect("/inventory/login")
}

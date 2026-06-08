"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, ShieldCheck, ShieldOff, UserCog, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

const ROLES = ["CUSTOMER", "INVENTORY_MANAGER", "ADMIN", "SUPER_ADMIN"] as const
type Role = typeof ROLES[number]

interface Props {
  userId: string
  currentRole: Role
  isActive: boolean
  isSelf: boolean
}

export function UserActionsMenu({ userId, currentRole, isActive, isSelf }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function doAction(body: Record<string, string>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Action failed")
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <MoreHorizontal className="h-4 w-4" />
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCog className="h-4 w-4 mr-2" />
            Change Role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ROLES.filter((r) => r !== currentRole).map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => doAction({ action: "changeRole", role })}
              >
                {role}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {isActive ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (confirm("Deactivate this user? They will be signed out immediately.")) {
                doAction({ action: "deactivate" })
              }
            }}
          >
            <ShieldOff className="h-4 w-4 mr-2" />
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => doAction({ action: "activate" })}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Activate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

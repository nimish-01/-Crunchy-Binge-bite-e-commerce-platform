"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, signOut, getSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
type LoginInput = z.infer<typeof loginSchema>

const ALLOWED_ROLES = ["INVENTORY_MANAGER", "ADMIN", "SUPER_ADMIN"]

export default function InventoryLoginPage() {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setError("")
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    if (result?.error || !result?.ok) {
      setError("Invalid email or password")
      return
    }
    const session = await getSession()
    const role = session?.user?.role as string | undefined
    if (role && ALLOWED_ROLES.includes(role)) {
      router.push("/inventory")
      router.refresh()
    } else {
      setError("Access denied. Inventory team credentials required.")
      await signOut({ redirect: false })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-brand-500/15 flex items-center justify-center">
                <Package className="h-6 w-6 text-brand-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Inventory Portal</CardTitle>
            <CardDescription>Sign in with your inventory team account</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="inventory@bingebite.in"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Signing in…</>
                  : "Sign In to Inventory"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">← Back to store</Link>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Not inventory team?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">Customer login</Link>
          {" · "}
          <Link href="/admin/login" className="text-brand-400 hover:text-brand-300">Admin login</Link>
        </p>
      </div>
    </div>
  )
}

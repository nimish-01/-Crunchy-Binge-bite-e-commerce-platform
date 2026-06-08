import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from "@/contexts/cart-context"
import { auth } from "@/auth"
import { SessionProvider } from "next-auth/react"
import { NotificationProvider } from "@/contexts/notification-context"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Binge Bite — Premium Makhana", template: "%s | Binge Bite" },
  description: "Premium flavored makhana. Guilt-free snacking, delivered to your door.",
  keywords: ["makhana", "fox nuts", "healthy snacks", "premium snacks", "binge bite"],
  openGraph: {
    title: "Binge Bite — Premium Makhana",
    description: "Premium flavored makhana. Guilt-free snacking, delivered to your door.",
    type: "website",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <SessionProvider session={session}>
          <NotificationProvider userId={session?.user?.id}>
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

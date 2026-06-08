import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl w-fit">
          <span className="text-brand-500">🌾</span>
          <span>Binge Bite</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}

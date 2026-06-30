import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Ticket,
  Bell, Image as ImageIcon, Settings, Warehouse,
  RotateCcw, Megaphone, UserCheck, Star, Award, TrendingUp,
  Globe, Truck, BoxIcon, MapPin, RefreshCw,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  superAdminOnly?: boolean
  badge?: string
}

export type NavGroup = {
  group: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard",   href: "/admin",            icon: LayoutDashboard },
      { label: "Analytics",   href: "/admin/analytics",  icon: TrendingUp },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Products",    href: "/admin/products",   icon: Package },
      { label: "Categories",  href: "/admin/categories", icon: Tag },
      { label: "Media Library", href: "/admin/media",    icon: ImageIcon },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Orders",      href: "/admin/orders",     icon: ShoppingBag },
      { label: "Returns",     href: "/admin/returns",     icon: RotateCcw },
      { label: "Coupons",     href: "/admin/coupons",     icon: Ticket },
      { label: "Promotions",  href: "/admin/promotions",  icon: Megaphone },
    ],
  },
  {
    group: "Customers",
    items: [
      { label: "Customers",   href: "/admin/customers",  icon: UserCheck },
      { label: "Reviews",     href: "/admin/reviews",     icon: Star },
      { label: "Loyalty",     href: "/admin/loyalty",     icon: Award },
      { label: "Users",       href: "/admin/users",       icon: Users },
    ],
  },
  {
    group: "Shipping",
    items: [
      { label: "Dashboard",       href: "/admin/shipping",           icon: Truck },
      { label: "Shipments",       href: "/admin/shipping/shipments", icon: Package },
      { label: "Packing Queue",   href: "/admin/shipping/packing",   icon: BoxIcon },
      { label: "Returns",         href: "/admin/shipping/returns",   icon: RotateCcw },
      { label: "Exchanges",       href: "/admin/shipping/exchanges", icon: RefreshCw },
      { label: "Delivery Zones",  href: "/admin/shipping/zones",     icon: MapPin },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Inventory",     href: "/admin/inventory",     icon: Warehouse },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Homepage CMS", href: "/admin/cms/homepage", icon: Globe },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings",    href: "/admin/settings",   icon: Settings, superAdminOnly: true },
    ],
  },
]

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import OrderCelebration from "@/components/shop/order-celebration"

interface Props {
  searchParams: Promise<{ order?: string }>
}

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { order: orderNumber } = await searchParams

  if (!orderNumber) redirect("/")

  const session = await auth()
  if (!session?.user?.id) redirect(`/login?callbackUrl=/order-success?order=${orderNumber}`)

  const [order, settings, user] = await Promise.all([
    prisma.order.findFirst({
      where: { orderNumber, userId: session.user.id },
      include: {
        address: true,
        items: {
          include: {
            product: { select: { name: true, images: true } },
            variant: { select: { weight: true } },
          },
        },
      },
    }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { loyaltyPoints: true },
    }),
  ])

  if (!order) redirect("/orders")

  // Estimate points earned: 1 point per ₹10 spent (matches typical rule)
  const pointsEarned = Math.floor(Number(order.total) / 10)

  const config = {
    headline:    "Order placed successfully!",
    message:     "Thank you! We're preparing your order right away.",
    animation:   settings?.deliveryAnimation   ?? "CONFETTI",
    showReorder: settings?.deliveryShowReorder ?? true,
  }

  const items = order.items.map((i) => ({
    id:         i.id,
    name:       i.product.name,
    image:      i.product.images?.[0],
    weight:     i.variant.weight,
    quantity:   i.quantity,
    unitPrice:  Number(i.unitPrice),
    totalPrice: Number(i.totalPrice),
  }))

  const address = order.address
    ? {
        name:    order.address.name,
        phone:   order.address.phone,
        line1:   order.address.line1,
        line2:   order.address.line2,
        city:    order.address.city,
        state:   order.address.state,
        pincode: order.address.pincode,
      }
    : null

  return (
    <div className="container max-w-2xl py-12 space-y-6">
      <OrderCelebration
        orderNumber={order.orderNumber}
        orderId={order.id}
        headline={config.headline}
        message={config.message}
        animation={config.animation}
        showReorder={config.showReorder}
        total={Number(order.total)}
        subtotal={Number(order.subtotal)}
        discountAmount={Number(order.discountAmount)}
        deliveryCharge={Number(order.deliveryCharge)}
        paymentMethod={order.paymentMethod}
        items={items}
        address={address}
        loyaltyPoints={user?.loyaltyPoints ?? null}
        pointsEarned={pointsEarned}
      />
    </div>
  )
}

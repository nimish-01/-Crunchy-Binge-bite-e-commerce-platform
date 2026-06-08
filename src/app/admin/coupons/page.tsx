import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice, formatDate } from "@/lib/utils"
import CouponDialog from "./coupon-dialog"
import { CouponToggle, CouponDeleteButton } from "./coupon-actions"

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { usages: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons & Offers</h1>
        <CouponDialog />
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <p className="text-muted-foreground">No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type / Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Used / Limit</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => {
                const isExpired = new Date(coupon.validUntil) < new Date()
                return (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold text-brand-400">{coupon.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{coupon.type}</Badge>
                        <span className="text-sm font-medium">
                          {coupon.type === "PERCENTAGE"
                            ? `${coupon.value}%`
                            : coupon.type === "FLAT"
                            ? formatPrice(coupon.value)
                            : "Free Ship"}
                          {coupon.maxDiscount ? (
                            <span className="text-muted-foreground font-normal"> (max {formatPrice(coupon.maxDiscount)})</span>
                          ) : null}
                        </span>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{coupon.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.minOrderValue > 0 ? formatPrice(coupon.minOrderValue) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon._count.usages}
                      <span className="text-muted-foreground"> / {coupon.totalUsageLimit ?? "∞"}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(coupon.validUntil)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={isExpired ? "secondary" : coupon.isActive ? "success" : "destructive"}
                        className="text-xs"
                      >
                        {isExpired ? "Expired" : coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <CouponToggle id={coupon.id} isActive={coupon.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <CouponDialog coupon={coupon} />
                        <CouponDeleteButton id={coupon.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

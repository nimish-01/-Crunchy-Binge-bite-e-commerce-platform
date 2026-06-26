import PromotionForm from "@/components/admin/promotions/promotion-form"

export default function NewPromotionPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Promotion</h1>
        <p className="text-muted-foreground text-sm mt-1">Create an announcement bar, banner, popup, or campaign</p>
      </div>
      <PromotionForm />
    </div>
  )
}

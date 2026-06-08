"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Edit, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { categorySchema, type CategoryInput } from "@/lib/validations/product"
import { slugify } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Category } from "@/types"

interface Props { category?: Category }

export default function CategoryDialog({ category }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!category

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? {
      name: category.name, slug: category.slug, description: category.description ?? "",
      sortOrder: category.sortOrder, isActive: category.isActive,
    } : { name: "", slug: "", description: "", sortOrder: 0, isActive: true },
  })

  const nameValue = watch("name")

  async function onSubmit(data: CategoryInput) {
    const url = isEdit ? `/api/admin/categories/${category.id}` : "/api/admin/categories"
    const method = isEdit ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    const json = await res.json()
    if (!json.success) { toast({ title: json.error ?? "Failed", variant: "destructive" }); return }
    toast({ title: isEdit ? "Category updated" : "Category created" })
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit
          ? <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
          : <Button variant="brand"><Plus className="h-4 w-4" />Add Category</Button>
        }
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="Classic Flavors" {...register("name")} onBlur={() => { if (!isEdit) setValue("slug", slugify(nameValue)) }} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Slug *</Label>
            <Input placeholder="classic-flavors" {...register("slug")} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional description" {...register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" {...register("sortOrder")} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="active" defaultChecked={category?.isActive ?? true} onCheckedChange={(v) => setValue("isActive", v)} />
            <Label htmlFor="active">Active</Label>
          </div>
          <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : isEdit ? "Save Changes" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

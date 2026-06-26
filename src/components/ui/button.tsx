"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "ring-offset-background transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        outline:     "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost:       "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link:        "text-primary underline-offset-4 hover:underline p-0 h-auto",
        brand:       "bg-brand-500 text-zinc-950 hover:bg-brand-400 active:bg-brand-600 font-semibold active:scale-[0.98] shadow-brand-sm hover:shadow-brand-md transition-all",
        success:     "bg-green-500 text-white hover:bg-green-400 active:scale-[0.98]",
        warning:     "bg-yellow-500 text-zinc-950 hover:bg-yellow-400 active:scale-[0.98]",
        "brand-outline": "border border-brand-500/50 text-brand-400 hover:bg-brand-500/8 hover:border-brand-500 active:scale-[0.98]",
      },
      size: {
        xs:      "h-7 rounded-md px-2.5 text-xs gap-1 [&_svg]:size-3",
        sm:      "h-9 rounded-lg px-3.5 gap-1.5 [&_svg]:size-3.5",
        default: "h-10 px-4 py-2 [&_svg]:size-4",
        lg:      "h-11 rounded-lg px-6 text-sm gap-2 [&_svg]:size-4",
        xl:      "h-12 rounded-xl px-8 text-base font-semibold gap-2 [&_svg]:size-5",
        icon:    "h-10 w-10 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-lg [&_svg]:size-3.5",
        "icon-lg": "h-12 w-12 rounded-xl [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

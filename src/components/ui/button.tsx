import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* ── Harax game buttons ───────────────────────────────────────
   Chunky, outlined, with a hard bevel edge underneath. Pressing
   sinks the button into its bevel — like a real arcade button. */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold font-display transition-[transform,box-shadow,background-color,color,border-color] duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 active:translate-y-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-2 border-ink bg-primary text-primary-foreground shadow-[0_4px_0_0_var(--bevel-lemon)] hover:bg-lemon-soft active:shadow-[0_1px_0_0_var(--bevel-lemon)] dark:bg-primary dark:text-primary-foreground",
        destructive:
          "border-2 border-ink bg-destructive text-white shadow-[0_4px_0_0_var(--bevel-red)] hover:brightness-110 active:shadow-[0_1px_0_0_var(--bevel-red)] dark:bg-destructive dark:text-white",
        outline:
          "border-2 border-edge bg-card text-foreground shadow-[0_4px_0_0_var(--edge-soft)] hover:bg-secondary active:shadow-[0_1px_0_0_var(--edge-soft)] dark:bg-card dark:text-foreground",
        secondary:
          "border-2 border-edge bg-secondary text-secondary-foreground shadow-[0_4px_0_0_var(--edge-soft)] hover:bg-muted active:shadow-[0_1px_0_0_var(--edge-soft)]",
        ink:
          "border-2 border-ink bg-ink text-lemon shadow-[0_4px_0_0_rgba(12,17,11,0.35)] hover:bg-forest active:shadow-[0_1px_0_0_rgba(12,17,11,0.35)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:translate-y-0 dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-2xl px-6 text-base has-[>svg]:px-5",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

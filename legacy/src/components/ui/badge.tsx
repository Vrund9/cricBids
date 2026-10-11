import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-border/50 bg-surface/60 backdrop-blur transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary hover:bg-primary/25",
        secondary: "bg-muted text-foreground/80 hover:bg-muted/80",
        destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25",
        success: "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25",
        outline: "bg-transparent",
        soft: "bg-surface-alt/70 text-foreground/70 hover:text-foreground hover:bg-surface-alt"
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

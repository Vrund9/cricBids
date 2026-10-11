import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ring-offset-background select-none",
  {
    variants: {
      variant: {
        default: "rounded-full bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90",
        destructive: "rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "rounded-full border border-border/60 bg-surface hover:bg-surface-alt/70",
        'outline-soft': "rounded-full ring-1 ring-border/60 bg-surface/40 backdrop-blur hover:bg-surface/70",
        secondary: "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-full hover:bg-muted/60",
        subtle: "rounded-full bg-muted text-foreground/90 hover:bg-muted/70",
        soft: "rounded-full bg-primary/15 text-primary hover:bg-primary/25",
        link: "rounded-none border-0 p-0 h-auto text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
        pill: "h-9 px-6 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

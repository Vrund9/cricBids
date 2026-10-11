import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'elevated' | 'inset'
}

const baseClasses = "rounded-xl ring-1 ring-border/60 bg-surface text-foreground transition-shadow"
const variantMap: Record<NonNullable<CardProps['variant']>, string> = {
  default: "shadow-sm hover:shadow-md",
  muted: "bg-surface-alt/60 backdrop-blur-sm shadow-sm hover:shadow-md",
  elevated: "shadow-md hover:shadow-lg",
  inset: "bg-surface-alt border border-border/50 ring-0 shadow-inner"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant='default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(baseClasses, variantMap[variant], className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
)
CardHeader.displayName = "CardHeader"

const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold leading-tight tracking-tight", className)} {...props}>{children}</h3>
)
CardTitle.displayName = "CardTitle"

const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)
CardDescription.displayName = "CardDescription"

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
)
CardContent.displayName = "CardContent"

const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-5 pt-0", className)} {...props} />
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

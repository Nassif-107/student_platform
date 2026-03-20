import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'text-sm font-semibold tracking-[-0.01em]',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground',
          'shadow-md shadow-primary/20',
          'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25',
          'active:shadow-sm',
        ].join(' '),
        destructive: [
          'bg-destructive text-destructive-foreground',
          'shadow-md shadow-destructive/20',
          'hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/25',
        ].join(' '),
        outline: [
          'border border-input bg-background',
          'shadow-xs',
          'hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20',
        ].join(' '),
        secondary: [
          'bg-secondary text-secondary-foreground',
          'shadow-xs',
          'hover:bg-secondary/80 hover:shadow-sm',
        ].join(' '),
        ghost: [
          'hover:bg-accent hover:text-accent-foreground',
        ].join(' '),
        link: [
          'text-primary underline-offset-4 hover:underline',
        ].join(' '),
        success: [
          'bg-success text-success-foreground',
          'shadow-md shadow-success/20',
          'hover:bg-success/90 hover:shadow-lg hover:shadow-success/25',
        ].join(' '),
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 rounded-lg px-3.5 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(props as HTMLMotionProps<'button'>)}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
export type { ButtonProps }

import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display font-bold transition-colors duration-150 ease-out-quint outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
  {
    variants: {
      variant: {
        // Volt como relleno de acción principal — texto siempre ink-950, nunca blanco (The Fill, Not Ink Rule)
        default: 'bg-primary text-primary-foreground hover:bg-volt-bright focus-visible:shadow-volt-glow',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/40',
        outline:
          'border border-border bg-transparent text-foreground hover:border-muted-foreground focus-visible:shadow-volt-glow',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted focus-visible:shadow-volt-glow',
        ghost: 'bg-transparent text-foreground hover:bg-accent focus-visible:shadow-volt-glow',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-14 px-6 text-base',
        sm: 'h-touch px-4 text-sm',
        lg: 'h-16 px-8 text-lg',
        icon: 'h-touch w-touch',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button };

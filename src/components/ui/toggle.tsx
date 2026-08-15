'use client';

import * as React from 'react';
import { Toggle as TogglePrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Base del componente "Chip" — filtros y selección (objetivo, nivel, sexo) (ver DESIGN.md § Components → Chips)
const toggleVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-150 ease-out-quint disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-secondary data-[state=off]:text-muted-foreground',
  {
    variants: {
      size: {
        default: 'h-touch px-4',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-14 px-6 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ size }), className)} {...props} />
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };

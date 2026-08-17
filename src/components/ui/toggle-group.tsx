'use client';

import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
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

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn('flex flex-wrap items-center gap-2', className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ size }}>{children}</ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>
>(({ className, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(toggleVariants({ size: context.size || size }), className)}
      {...props}
    />
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };

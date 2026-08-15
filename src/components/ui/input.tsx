import * as React from 'react';

import { cn } from '@/lib/utils';

// Fondo lleno, sin borde en reposo; Volt Focus Glow al enfocar (ver DESIGN.md § Components → Inputs)
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-14 w-full rounded-md border border-transparent bg-secondary px-4 text-base text-foreground transition-colors duration-150 ease-out-quint placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-volt-glow focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };

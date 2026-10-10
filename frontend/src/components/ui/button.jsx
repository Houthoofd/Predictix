import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-xs transition-all active:scale-[0.99]',
        brand:
          'bg-[#1D7CEA] text-white hover:bg-[#156AC7] shadow-xs shadow-[#1D7CEA]/20 transition-all active:scale-[0.99]',
        gradient:
          'bg-gradient-to-r from-[#1D7CEA] via-[#0EAFE9] to-[#0CBFAA] text-white hover:opacity-95 shadow-xs shadow-[#1D7CEA]/25 transition-all active:scale-[0.99]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs',
        outline:
          'border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 text-zinc-900 shadow-xs transition-colors',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80',
        ghost:
          'hover:bg-zinc-100 hover:text-zinc-900 text-zinc-600',
        link:
          'text-[#1D7CEA] underline-offset-4 hover:underline p-0 h-auto font-normal',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };

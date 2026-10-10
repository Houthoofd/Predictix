import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-800',
        secondary:
          'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80',
        destructive:
          'border-transparent bg-rose-50 text-rose-700 border border-rose-200',
        outline: 'text-zinc-700 border-zinc-200 bg-white',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-medium',
        blue: 'border-blue-200 bg-blue-50 text-blue-700 font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

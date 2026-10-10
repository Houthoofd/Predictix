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
        success: 'border-[#0CBFAA]/25 bg-[#0CBFAA]/10 text-[#078575] font-medium',
        brand: 'border-[#1D7CEA]/20 bg-[#1D7CEA]/10 text-[#1D7CEA] font-medium',
        teal: 'border-[#0CBFAA]/25 bg-[#0CBFAA]/10 text-[#078575] font-medium',
        sky: 'border-[#0EAFE9]/25 bg-[#0EAFE9]/10 text-[#0275A0] font-medium',
        navy: 'border-slate-800 bg-[#0F172A] text-white font-medium',
        blue: 'border-[#1D7CEA]/25 bg-[#1D7CEA]/10 text-[#1D7CEA] font-medium',
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

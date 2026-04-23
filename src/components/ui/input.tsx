import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/helpers/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-sm leading-none text-foreground shadow-sm outline-none transition-colors duration-150 placeholder:text-muted-foreground/70 focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
        className,
      )}
      {...props}
    />
  );
}

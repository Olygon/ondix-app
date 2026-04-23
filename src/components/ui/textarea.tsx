import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/helpers/cn";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[6px] border border-border bg-card px-3 py-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

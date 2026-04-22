import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const variantClasses = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_28px_60px_-32px_rgba(242,74,0,0.9)] hover:-translate-y-0.5 hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground shadow-[0_24px_50px_-34px_rgba(212,175,55,0.85)] hover:-translate-y-0.5 hover:brightness-95",
  outline:
    "border border-border bg-card/65 text-foreground hover:border-primary/20 hover:bg-primary/6",
  ghost: "bg-transparent text-foreground hover:bg-surface-muted",
} as const;

const sizeClasses = {
  sm: "h-10 px-3.5",
  md: "h-11 px-4",
  lg: "h-12 px-5",
} as const;

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  icon: LucideIcon;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
};

export function Button({
  children,
  className,
  icon: Icon,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 rounded-[12px] font-medium tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-55",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-[12px] leading-none">{children}</span>
    </button>
  );
}

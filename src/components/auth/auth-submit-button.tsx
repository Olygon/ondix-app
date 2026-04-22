"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthSubmitButtonProps = {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  icon: LucideIcon;
  pendingLabel?: string;
  variant?: "ghost" | "outline" | "primary" | "secondary";
};

export function AuthSubmitButton({
  className,
  children,
  disabled,
  fullWidth = true,
  icon,
  pendingLabel,
  variant = "primary",
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      icon={pending ? LoaderCircle : icon}
      variant={variant}
      disabled={disabled || pending}
      className={cn(fullWidth && "w-full", className)}
    >
      {pending ? pendingLabel || "Processando..." : children}
    </Button>
  );
}

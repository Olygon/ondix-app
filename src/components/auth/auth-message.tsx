"use client";

import type { CSSProperties, ReactNode } from "react";
import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

type AuthMessageProps = {
  children: ReactNode;
  className?: string;
  tone?: "error" | "info" | "success" | "warning";
};

const iconMap = {
  error: CircleAlert,
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
} as const;

const lightStyles: Record<NonNullable<AuthMessageProps["tone"]>, CSSProperties> = {
  error: {
    backgroundColor: "rgba(254, 242, 242, 0.42)",
    borderColor: "rgba(127, 29, 29, 0.22)",
    color: "#7F1D1D",
  },
  info: {
    backgroundColor: "rgba(239, 246, 255, 0.42)",
    borderColor: "rgba(30, 64, 175, 0.22)",
    color: "#1E40AF",
  },
  success: {
    backgroundColor: "rgba(236, 253, 245, 0.42)",
    borderColor: "rgba(6, 95, 70, 0.22)",
    color: "#065F46",
  },
  warning: {
    backgroundColor: "rgba(255, 251, 235, 0.42)",
    borderColor: "rgba(146, 64, 14, 0.22)",
    color: "#92400E",
  },
};

const darkStyles: Record<NonNullable<AuthMessageProps["tone"]>, CSSProperties> = {
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(252, 165, 165, 0.24)",
    color: "#FEF2F2",
  },
  info: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(147, 197, 253, 0.24)",
    color: "#EFF6FF",
  },
  success: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(110, 231, 183, 0.24)",
    color: "#ECFDF5",
  },
  warning: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(253, 230, 138, 0.24)",
    color: "#FFFBEB",
  },
};

export function AuthMessage({
  children,
  className,
  tone = "info",
}: AuthMessageProps) {
  const { isDark } = useTheme();
  const Icon = iconMap[tone];
  const palette = isDark ? darkStyles[tone] : lightStyles[tone];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-card border px-4 py-3 text-xs font-bold leading-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      style={palette}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: palette.color }} />
      <div className="min-w-0" style={{ color: palette.color }}>
        {children}
      </div>
    </div>
  );
}

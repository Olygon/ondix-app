"use client";

import type { CSSProperties, ReactNode } from "react";
import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/helpers/cn";

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
    backgroundColor: "rgba(255, 1, 1, 0.2)",
    borderColor: "#a20202",
    color: "#a20202",
  },
  info: {
    backgroundColor: "rgba(0, 140, 255, 0.2)",
    borderColor: "#0515a2",
    color: "#0515a2",
  },
  success: {
    backgroundColor: "rgba(0, 255, 133, 0.2)",
    borderColor: "#008b49",
    color: "#008b49",
  },
  warning: {
    backgroundColor: "rgba(255, 205, 0, 0.2)",
    borderColor: "#aa8b0a",
    color: "#aa8b0a",
  },
};

const darkStyles: Record<NonNullable<AuthMessageProps["tone"]>, CSSProperties> = {
  error: {
    backgroundColor: "rgba(162, 2, 2, 0.5)",
    borderColor: "#ff0101",
    color: "#ff0101",
  },
  info: {
    backgroundColor: "rgba(5, 21, 162, 0.5)",
    borderColor: "#008cff",
    color: "#008cff",
  },
  success: {
    backgroundColor: "rgba(0, 139, 73, 0.5)",
    borderColor: "#00ff85",
    color: "#00ff85",
  },
  warning: {
    backgroundColor: "rgba(170, 139, 10, 0.5)",
    borderColor: "#ffcd00",
    color: "#ffcd00",
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

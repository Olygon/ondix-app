import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  className?: string;
  label: string;
  tone?: "error" | "info" | "success" | "warning";
};

const toneClasses = {
  error:
    "border-red-300/60 bg-red-50/70 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  info:
    "border-blue-300/60 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  success:
    "border-emerald-300/60 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  warning:
    "border-amber-300/60 bg-amber-50/70 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
} as const;

export function StatusBadge({
  className,
  label,
  tone = "info",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

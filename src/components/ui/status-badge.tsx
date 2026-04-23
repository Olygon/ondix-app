import { cn } from "@/lib/helpers/cn";

type StatusBadgeProps = {
  className?: string;
  label: string;
  tone?: "error" | "info" | "success" | "warning";
};

const toneClasses = {
  error:
    "border-[#a20202] bg-[#ff0101]/20 text-[#a20202] dark:border-[#ff0101] dark:bg-[#a20202]/50 dark:text-[#ff0101]",
  info:
    "border-[#0515a2] bg-[#008cff]/20 text-[#0515a2] dark:border-[#008cff] dark:bg-[#0515a2]/50 dark:text-[#008cff]",
  success:
    "border-[#008b49] bg-[#00ff85]/20 text-[#008b49] dark:border-[#00ff85] dark:bg-[#008b49]/50 dark:text-[#00ff85]",
  warning:
    "border-[#aa8b0a] bg-[#ffcd00]/20 text-[#aa8b0a] dark:border-[#ffcd00] dark:bg-[#aa8b0a]/50 dark:text-[#ffcd00]",
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

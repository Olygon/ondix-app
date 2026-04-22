import Link from "next/link";

import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarMenuItemProps = {
  isActive: boolean;
  item: NavigationItem;
};

export function SidebarMenuItem({
  isActive,
  item,
}: SidebarMenuItemProps) {
  const className = cn(
    "group flex w-full items-center gap-2 rounded-[6px] bg-transparent px-2 py-0.5 text-left transition-all duration-150",
    isActive
      ? "bg-white/[0.06] text-primary"
      : "text-sidebar-muted hover:bg-white/[0.03] hover:text-primary",
  );

  const content = (
    <>
      <item.icon
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-colors duration-150",
          isActive ? "text-primary" : "text-sidebar-muted group-hover:text-primary",
        )}
      />
      <span className="truncate text-[12px] leading-[1.1] transition-transform duration-150 group-hover:scale-[1.02]">
        {item.title}
      </span>
    </>
  );

  if (item.disabled) {
    return (
      <button type="button" className={className} aria-disabled="true">
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

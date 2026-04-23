import type { NavigationGroup } from "@/lib/navigation";
import { cn } from "@/lib/helpers/cn";

import { SidebarMenuItem } from "@/components/layout/sidebar-menu-item";

type SidebarMenuGroupProps = {
  currentPathname: string;
  group: NavigationGroup;
  isFirst?: boolean;
};

export function SidebarMenuGroup({
  currentPathname,
  group,
  isFirst = false,
}: SidebarMenuGroupProps) {
  return (
    <section
      className={cn(
        "flex flex-col",
        !isFirst && "border-t border-sidebar-border/60 pt-0",
      )}
    >
      {group.label ? (
        <div className="px-1">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted/50">
            {group.label}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-px">
        {group.items.map((item) => {
          const isActive =
            !item.disabled &&
            (currentPathname === item.href ||
              (item.href !== "/" && currentPathname.startsWith(item.href)));

          return (
            <SidebarMenuItem
              key={item.href}
              item={item}
              isActive={isActive}
            />
          );
        })}
      </div>
    </section>
  );
}

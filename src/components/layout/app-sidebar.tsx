"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { Building2, MoonStar, ShieldCheck, SunMedium } from "lucide-react";

import { OndixLogo } from "@/components/layout/ondix-logo";
import { SidebarMenuGroup } from "@/components/layout/sidebar-menu-group";
import { useTheme } from "@/components/providers/theme-provider";
import type { PermissionGrant } from "@/lib/access-control/resources";
import { filterNavigationGroupsByPermissions } from "@/lib/navigation";

const footerActionClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-transparent text-sidebar-muted transition-all duration-150 hover:scale-[1.03] hover:text-primary";

function InstagramIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.2 7.2c-.2-.9-.9-1.6-1.8-1.8C16.8 5 12 5 12 5s-4.8 0-6.4.4c-.9.2-1.6.9-1.8 1.8C3.4 8.8 3.4 12 3.4 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C7.2 19 12 19 12 19s4.8 0 6.4-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8Z" />
      <path d="M10 9.4 14.6 12 10 14.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

type AppSidebarProps = {
  accessProfileName: string;
  canAccessSubscriber: boolean;
  companyName: string;
  permissions: PermissionGrant[];
  userName: string;
};

export function AppSidebar({
  accessProfileName,
  canAccessSubscriber,
  companyName,
  permissions,
  userName,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const navigationGroups = filterNavigationGroupsByPermissions(permissions);

  return (
    <aside className="w-full shrink-0 border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col px-3 py-3 lg:px-4 lg:py-4">
        <header className="border-b border-sidebar-border/80 pb-1.5">
          <OndixLogo />
        </header>

        <div className="flex items-center gap-2 border-b border-sidebar-border/80 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-white/[0.06] text-sidebar-foreground">
            <Building2 className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0">
            {canAccessSubscriber ? (
              <Link
                href="/assinante"
                className="block truncate text-[11px] font-medium text-sidebar-foreground transition-colors hover:text-primary"
              >
                {companyName}
              </Link>
            ) : (
              <p className="truncate text-[11px] font-medium text-sidebar-foreground">
                {companyName}
              </p>
            )}
            <p className="truncate text-[10px] text-sidebar-muted">
              Empresa ativa
            </p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 py-1">
          <div className="flex flex-col gap-1">
            {navigationGroups.map((group, index) => (
              <SidebarMenuGroup
                key={group.id}
                group={group}
                currentPathname={pathname}
                isFirst={index === 0}
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border/90 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-white/[0.06] text-sidebar-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-sidebar-foreground">
                {userName}
              </p>
              <p className="truncate text-[10px] text-sidebar-muted">
                {accessProfileName}
              </p>
            </div>
          </div>

          <footer className="mt-0 flex items-center justify-center gap-1">
            <div className="flex items-center gap-1">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className={footerActionClassName}
                aria-label="Instagram"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
                <span className="sr-only">Instagram</span>
              </a>

              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                className={footerActionClassName}
                aria-label="YouTube"
              >
                <YouTubeIcon className="h-3.5 w-3.5" />
                <span className="sr-only">YouTube</span>
              </a>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className={footerActionClassName}
              aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {isDark ? (
                <SunMedium className="h-3.5 w-3.5" />
              ) : (
                <MoonStar className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">
                {isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              </span>
            </button>
          </footer>
        </div>
      </div>
    </aside>
  );
}

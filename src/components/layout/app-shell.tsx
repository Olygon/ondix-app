import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { PermissionGrant } from "@/lib/access-control/resources";
import type { ActivePeriod } from "@/lib/active-period/types";

export function AppShell({
  accessProfileName,
  activePeriod,
  canAccessSubscriber,
  children,
  companyName,
  permissions,
  userAccountHref,
  userAvatarUrl,
  userName,
  userShortName,
}: Readonly<{
  accessProfileName: string;
  activePeriod: ActivePeriod;
  canAccessSubscriber: boolean;
  children: ReactNode;
  companyName: string;
  permissions: PermissionGrant[];
  userAccountHref: string | null;
  userAvatarUrl: string | null;
  userName: string;
  userShortName: string;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <AppSidebar
        accessProfileName={accessProfileName}
        canAccessSubscriber={canAccessSubscriber}
        companyName={companyName}
        permissions={permissions}
        userName={userName}
      />

      <div className="min-w-0">
        <AppHeader
          activePeriod={activePeriod}
          userAccountHref={userAccountHref}
          userAvatarUrl={userAvatarUrl}
          userName={userName}
          userShortName={userShortName}
        />

        <main className="px-4 py-5 lg:px-10 lg:py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

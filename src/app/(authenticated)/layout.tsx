import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { hasPermissionInMatrix } from "@/lib/access-control/permissions";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { isManagerialLevel } from "@/lib/access-management/constants";
import { getActivePeriodFor } from "@/lib/active-period/service";
import { requireAppContext } from "@/lib/auth/app-context";
import { buildDataUrl } from "@/lib/media";

function getUserShortName(fullName: string, shortName?: string | null) {
  return shortName?.trim() || fullName.trim().split(" ")[0] || fullName;
}

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const context = await requireAppContext();
  const activePeriod = await getActivePeriodFor(context.user.id, context.company.id);
  const canAccessUserAccount =
    isManagerialLevel(context.accessProfile.level) &&
    hasPermissionInMatrix(context.permissions, RESOURCE_CODES.userAccount, "view");

  return (
    <AppShell
      accessProfileName={context.accessProfile.name}
      activePeriod={activePeriod}
      canAccessSubscriber={context.canAccessSubscriber}
      companyName={context.company.name}
      permissions={context.permissions}
      userAccountHref={
        canAccessUserAccount
          ? `/assinante/gestao-acessos/usuarios/${context.user.id}`
          : null
      }
      userAvatarUrl={buildDataUrl(context.user.photoMimeType, context.user.photoData)}
      userName={context.user.fullName}
      userShortName={getUserShortName(context.user.fullName, context.user.shortName)}
    >
      {children}
    </AppShell>
  );
}

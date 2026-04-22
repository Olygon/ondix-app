import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import {
  RESOURCE_CODES,
  type PermissionAction,
  type PermissionGrant,
  type ResourceCode,
} from "@/lib/access-control/resources";
import { hasPermissionInMatrix } from "@/lib/access-control/permissions";
import { prisma } from "@/lib/db";
import { getUserSession } from "@/lib/auth/session";

const resolveAppContext = cache(async () => {
  const session = await getUserSession();

  if (!session) {
    return null;
  }

  const membership = await prisma.userCompany.findFirst({
    where: {
      id: session.userCompanyId,
      userId: session.userId,
      companyId: session.activeCompanyId,
      isActive: true,
      accessProfile: {
        status: "ACTIVE",
      },
      company: {
        isActive: true,
      },
      user: {
        status: {
          notIn: ["BLOCKED", "CANCELED"],
        },
      },
    },
    include: {
      user: true,
      company: {
        include: {
          certificates: {
            orderBy: [{ name: "asc" }],
          },
          lastEditedByUser: true,
          responsibleAdminUser: true,
        },
      },
      accessProfile: {
        include: {
          accessProfilePermissions: {
            include: {
              permissionResource: true,
            },
            orderBy: [
              {
                permissionResource: {
                  name: "asc",
                },
              },
            ],
          },
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  const permissions: PermissionGrant[] = membership.accessProfile.accessProfilePermissions.map(
    (permission) => ({
      canCreate: permission.canCreate,
      canDelete: permission.canDelete,
      canEdit: permission.canEdit,
      canManage: permission.canManage,
      canView: permission.canView,
      resourceCode: permission.permissionResource.code as ResourceCode,
    }),
  );

  return {
    accessProfile: membership.accessProfile,
    canAccessSubscriber: hasPermissionInMatrix(
      permissions,
      RESOURCE_CODES.subscriberCompany,
      "view",
    ),
    company: membership.company,
    membership,
    permissions,
    session,
    user: membership.user,
  };
});

export async function getAppContext() {
  return resolveAppContext();
}

export async function requireAppContext() {
  const context = await resolveAppContext();

  if (!context) {
    redirect("/session-invalid?status=no-company");
  }

  return context;
}

export async function getCurrentUser() {
  return (await resolveAppContext())?.user ?? null;
}

export async function requireCurrentUser() {
  return (await requireAppContext()).user;
}

export async function getActiveCompany() {
  return (await resolveAppContext())?.company ?? null;
}

export async function requireActiveCompany() {
  return (await requireAppContext()).company;
}

export async function requirePermission(
  resourceCode: ResourceCode,
  action: PermissionAction = "view",
) {
  const context = await requireAppContext();

  if (!hasPermissionInMatrix(context.permissions, resourceCode, action)) {
    redirect("/acesso-negado");
  }

  return context;
}

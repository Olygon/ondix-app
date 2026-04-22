import "server-only";

import { redirect } from "next/navigation";

import { getAppContext, requireAppContext } from "@/lib/auth/app-context";
import {
  getEmptyPermissionAccess,
  getPermissionAccess as getPermissionAccessFromMatrix,
  hasPermissionInMatrix,
  type PermissionAccessState,
  type PermissionCheckAction,
} from "@/lib/access-control/permissions";
import type { ResourceCode } from "@/lib/access-control/resources";

type RequirePermissionOptions = {
  onDenied?: "access-denied" | "dashboard";
};

function redirectOnDenied(onDenied: RequirePermissionOptions["onDenied"] = "access-denied") {
  redirect(onDenied === "dashboard" ? "/" : "/acesso-negado");
}

export async function hasPermission(
  resourceCode: ResourceCode,
  action: PermissionCheckAction = "view",
) {
  const context = await getAppContext();

  if (!context) {
    return false;
  }

  return hasPermissionInMatrix(context.permissions, resourceCode, action);
}

export async function getPermissionAccess(
  resourceCode: ResourceCode,
): Promise<PermissionAccessState> {
  const context = await getAppContext();

  if (!context) {
    return getEmptyPermissionAccess();
  }

  return getPermissionAccessFromMatrix(context.permissions, resourceCode);
}

export async function requirePermission(
  resourceCode: ResourceCode,
  action: PermissionCheckAction = "view",
  options?: RequirePermissionOptions,
) {
  const context = await requireAppContext();

  if (!hasPermissionInMatrix(context.permissions, resourceCode, action)) {
    redirectOnDenied(options?.onDenied);
  }

  return context;
}

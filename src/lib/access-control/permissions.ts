import {
  hasPermission as hasPermissionGrant,
  permissionResourceCatalog,
  type PermissionAction,
  type PermissionGrant,
  type ResourceCode,
} from "@/lib/access-control/resources";

export type PermissionCheckAction = PermissionAction | "add";

export type PermissionAccessState = {
  canAdd: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canManage: boolean;
  canView: boolean;
};

const permissionResourceParentMap = new Map(
  permissionResourceCatalog.map((resource) => [resource.code, resource.parentCode]),
);

export function normalizePermissionAction(
  action: PermissionCheckAction = "view",
): PermissionAction {
  return action === "add" ? "create" : action;
}

export function getEmptyPermissionAccess(): PermissionAccessState {
  return {
    canAdd: false,
    canDelete: false,
    canEdit: false,
    canManage: false,
    canView: false,
  };
}

export function hasPermissionInMatrix(
  permissions: PermissionGrant[],
  resourceCode: ResourceCode,
  action: PermissionCheckAction = "view",
) {
  const normalizedAction = normalizePermissionAction(action);

  function hasPermissionWithHierarchy(currentCode: ResourceCode): boolean {
    if (!hasPermissionGrant(permissions, currentCode, normalizedAction)) {
      return false;
    }

    const parentCode = permissionResourceParentMap.get(currentCode);

    if (!parentCode) {
      return true;
    }

    return hasPermissionWithHierarchy(parentCode);
  }

  return hasPermissionWithHierarchy(resourceCode);
}

export function getPermissionAccess(
  permissions: PermissionGrant[],
  resourceCode: ResourceCode,
): PermissionAccessState {
  return {
    canAdd: hasPermissionInMatrix(permissions, resourceCode, "add"),
    canDelete: hasPermissionInMatrix(permissions, resourceCode, "delete"),
    canEdit: hasPermissionInMatrix(permissions, resourceCode, "edit"),
    canManage: hasPermissionInMatrix(permissions, resourceCode, "manage"),
    canView: hasPermissionInMatrix(permissions, resourceCode, "view"),
  };
}

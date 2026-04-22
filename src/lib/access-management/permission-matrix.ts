import type { ResourceCode } from "@/lib/access-control/resources";

export type PermissionMatrixNode = {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canView: boolean;
  code: ResourceCode;
  parentCode?: ResourceCode;
};

export function normalizePermissionRow<T extends PermissionMatrixNode>(row: T): T {
  let canView = row.canView;
  let canEdit = row.canEdit;
  let canCreate = row.canCreate;
  let canDelete = row.canDelete;

  if (canDelete) {
    canCreate = true;
    canEdit = true;
    canView = true;
  } else if (canCreate) {
    canEdit = true;
    canView = true;
  } else if (canEdit) {
    canView = true;
  }

  if (!canView && !canEdit && !canCreate && !canDelete) {
    canView = false;
    canEdit = false;
    canCreate = false;
    canDelete = false;
  }

  return {
    ...row,
    canCreate,
    canDelete,
    canEdit,
    canView,
  };
}

function applyParentPermission<T extends PermissionMatrixNode>(
  row: T,
  parent: T | undefined,
) {
  if (!parent) {
    return row;
  }

  return normalizePermissionRow({
    ...row,
    canCreate: row.canCreate && parent.canCreate,
    canDelete: row.canDelete && parent.canDelete,
    canEdit: row.canEdit && parent.canEdit,
    canView: row.canView && parent.canView,
  });
}

export function applyPermissionHierarchy<T extends PermissionMatrixNode>(rows: T[]): T[] {
  const rowMap = new Map(
    rows.map((row) => [row.code, normalizePermissionRow(row)]),
  );
  const resolved = new Map<ResourceCode, T>();

  function resolveRow(code: ResourceCode): T | undefined {
    if (resolved.has(code)) {
      return resolved.get(code);
    }

    const currentRow = rowMap.get(code);

    if (!currentRow) {
      return undefined;
    }

    const parentRow = currentRow.parentCode
      ? resolveRow(currentRow.parentCode)
      : undefined;
    const normalizedRow = applyParentPermission(currentRow, parentRow);

    resolved.set(code, normalizedRow);

    return normalizedRow;
  }

  return rows.map((row) => resolveRow(row.code) ?? normalizePermissionRow(row));
}

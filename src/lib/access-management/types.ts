import type { AccessLevel, AccessProfileTier, EntityStatus, UserStatus } from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";
import type { ResourceCode } from "@/lib/access-control/resources";

export type ManagedUserListRow = {
  accessProfileName: string;
  accessProfileTier: AccessProfileTier;
  department: string;
  email: string;
  fullName: string;
  id: string;
  isCurrentUser: boolean;
  jobTitle: string;
  lastLoginAt: string;
  shortName: string;
  status: UserStatus;
};

export type UserManagementPageData = {
  access: {
    accessProfiles: PermissionAccessState;
    userAccount: PermissionAccessState;
  };
  companyName: string;
  users: ManagedUserListRow[];
};

export type AccessProfileOption = {
  id: string;
  isAdministrator: boolean;
  isSystem: boolean;
  level: AccessLevel;
  name: string;
  sequenceNumber: number;
  status: EntityStatus;
  tier: AccessProfileTier;
};

export type UserAccountFormValues = {
  accessProfileId: string;
  department: string;
  email: string;
  fullName: string;
  jobTitle: string;
  photoFileName: string;
  photoPreviewUrl: string | null;
  phone: string;
  shortName: string;
  status: UserStatus;
};

export type UserAccountPageData = {
  access: {
    userAccount: PermissionAccessState;
  };
  canAssignAdministrator: boolean;
  companyName: string;
  createdAt: string;
  isEditMode: boolean;
  isCurrentUser: boolean;
  profileOptions: AccessProfileOption[];
  updatedAt: string;
  user: UserAccountFormValues & {
    id: string | null;
  };
};

export type AccessProfileListRow = {
  code: string;
  createdAt: string;
  id: string;
  isNative: boolean;
  isProtected: boolean;
  linkedUsersCount: number;
  name: string;
  status: EntityStatus;
  tier: AccessProfileTier;
  updatedAt: string;
};

export type AccessProfileListPageData = {
  access: {
    accessManagement: PermissionAccessState;
    accessProfileEditor: PermissionAccessState;
  };
  companyName: string;
  profiles: AccessProfileListRow[];
};

export type PermissionMatrixRow = {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canView: boolean;
  code: ResourceCode;
  id: string;
  isMenuVisible: boolean;
  module: string;
  name: string;
  parentCode?: ResourceCode;
  parentName: string;
  route: string;
  sortOrder: number;
};

export type AccessProfileEditorPageData = {
  access: {
    accessProfileEditor: PermissionAccessState;
  };
  canDelete: boolean;
  companyName: string;
  permissionMatrix: PermissionMatrixRow[];
  profile: {
    code: string;
    createdAt: string;
    createdByName: string;
    description: string;
    id: string | null;
    isNative: boolean;
    isProtected: boolean;
    name: string;
    sequenceNumber: number;
    status: EntityStatus;
    tier: AccessProfileTier;
    updatedAt: string;
    updatedAtKey: string;
    updatedByName: string;
  };
};

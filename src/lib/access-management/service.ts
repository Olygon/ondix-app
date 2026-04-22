import "server-only";

import { redirect } from "next/navigation";
import type {
  AccessLevel,
  AccessProfileTier,
  EntityStatus,
  UserStatus,
} from "@prisma/client";

import {
  permissionResourceCatalog,
  RESOURCE_CODES,
  type ResourceCode,
} from "@/lib/access-control/resources";
import {
  getPermissionAccess as getPermissionAccessFromMatrix,
  type PermissionCheckAction,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import {
  administratorManageResourceCodes,
  canAssignAdministratorProfile,
  formatProfileSequence,
  getDerivedAccessLevel,
  hiddenSystemProfileCodes,
  isManagerialLevel,
  nativeSystemAuditLabel,
  protectedSystemProfileCodes,
} from "@/lib/access-management/constants";
import { applyPermissionHierarchy } from "@/lib/access-management/permission-matrix";
import type {
  AccessProfileEditorPageData,
  AccessProfileListPageData,
  AccessProfileOption,
  ManagedUserListRow,
  PermissionMatrixRow,
  UserAccountPageData,
  UserManagementPageData,
} from "@/lib/access-management/types";
import { createUserSession } from "@/lib/auth/session";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import {
  formatBrazilPhone,
  formatDateBr,
  onlyDigits,
} from "@/lib/company/formatters";
import { prisma } from "@/lib/db";

const BLOCKED_ACCOUNT_MESSAGE =
  "Esta conta foi bloqueada. Contate o administrador da assinatura do sistema ou a equipe de suporte Ondix.";
const permissionResourceCatalogByCode = new Map(
  permissionResourceCatalog.map((resource) => [resource.code, resource]),
);

function buildDataUrl(
  mimeType?: string | null,
  data?: Uint8Array | Buffer | null,
) {
  if (!mimeType || !data) {
    return null;
  }

  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAccessProfileDisplayName(profile: { code: string; name: string }) {
  return profile.code === "OWNER" ? "Administrador" : profile.name;
}

function getManagedUserStatus(userStatus: UserStatus, isMembershipActive: boolean) {
  return isMembershipActive ? userStatus : "CANCELED";
}

function getAccessProfileAuditLabel(profile: {
  code: string;
  createdByUser?: { fullName: string } | null;
  isSystem: boolean;
  updatedByUser?: { fullName: string } | null;
}) {
  if (protectedSystemProfileCodes.has(profile.code)) {
    return {
      createdByName: nativeSystemAuditLabel,
      updatedByName: nativeSystemAuditLabel,
    };
  }

  return {
    createdByName: profile.createdByUser?.fullName ?? (profile.isSystem ? "ONDIX" : ""),
    updatedByName: profile.updatedByUser?.fullName ?? (profile.isSystem ? "ONDIX" : ""),
  };
}

function ensureManagerialLevel(level: AccessLevel) {
  if (!isManagerialLevel(level)) {
    redirect("/acesso-negado");
  }
}

async function requireUserManagementContext() {
  const context = await requirePermission(RESOURCE_CODES.accessManagement, "view");

  ensureManagerialLevel(context.accessProfile.level);

  return context;
}

async function requireUserAccountContext(action: PermissionCheckAction) {
  const context = await requirePermission(RESOURCE_CODES.userAccount, action);

  ensureManagerialLevel(context.accessProfile.level);

  return context;
}

async function requireAccessProfileListContext() {
  const context = await requirePermission(RESOURCE_CODES.accessProfiles, "view");

  ensureManagerialLevel(context.accessProfile.level);

  return context;
}

async function requireAccessProfileEditorContext(action: PermissionCheckAction) {
  const context = await requirePermission(RESOURCE_CODES.accessProfileEditor, action);

  ensureManagerialLevel(context.accessProfile.level);

  return context;
}

function normalizePermissionBooleans(row: {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canView: boolean;
  code: string;
  id: string;
}) {
  const resourceCode = row.code as ResourceCode;

  return {
    ...applyPermissionHierarchy([
      {
        ...row,
        code: resourceCode,
        parentCode: permissionResourceCatalogByCode.get(resourceCode)?.parentCode,
      },
    ])[0],
    code: resourceCode,
    id: row.id,
  };
}

function getManagePermissionValue(
  tier: AccessProfileTier,
  resourceCode: string,
  canView: boolean,
) {
  return (
    tier === "ADMINISTRATOR" &&
    canView &&
    administratorManageResourceCodes.has(resourceCode as ResourceCode)
  );
}

async function getProfileOptions(companyId: string, selectedProfileId?: string | null) {
  const profiles = await prisma.accessProfile.findMany({
    where: {
      code: {
        notIn: Array.from(hiddenSystemProfileCodes),
      },
      OR: [{ companyId }, { companyId: null, isSystem: true }],
      status: "ACTIVE",
    },
    orderBy: [{ sequenceNumber: "asc" }, { name: "asc" }],
  });

  const shouldLoadSelectedProfile =
    selectedProfileId && !profiles.some((profile) => profile.id === selectedProfileId);
  const selectedProfile = shouldLoadSelectedProfile
    ? await prisma.accessProfile.findFirst({
        where: {
          id: selectedProfileId,
          code: {
            notIn: Array.from(hiddenSystemProfileCodes),
          },
          OR: [{ companyId }, { companyId: null, isSystem: true }],
        },
      })
    : null;
  const normalizedProfiles = selectedProfile ? [...profiles, selectedProfile] : profiles;

  return normalizedProfiles.map(
    (profile) =>
      ({
        id: profile.id,
        isAdministrator: profile.isAdministrator,
        isSystem: profile.isSystem,
        level: profile.level,
        name: getAccessProfileDisplayName(profile),
        sequenceNumber: profile.sequenceNumber,
        status: profile.status,
        tier: profile.tier,
      }) satisfies AccessProfileOption,
  );
}

async function findMembershipUser(companyId: string, userId: string) {
  return prisma.userCompany.findFirst({
    where: {
      companyId,
      userId,
    },
    include: {
      accessProfile: true,
      user: true,
    },
  });
}

async function findEditableProfile(companyId: string, profileId: string) {
  return prisma.accessProfile.findFirst({
    where: {
      id: profileId,
      code: {
        notIn: Array.from(hiddenSystemProfileCodes),
      },
      OR: [{ companyId }, { companyId: null, isSystem: true }],
    },
    include: {
      accessProfilePermissions: {
        include: {
          permissionResource: true,
        },
      },
      createdByUser: true,
      updatedByUser: true,
      _count: {
        select: {
          userCompanies: {
            where: {
              companyId,
            },
          },
        },
      },
    },
  });
}

async function ensureUniqueUserEmail(email: string, userId?: string | null) {
  return prisma.user.findFirst({
    where: {
      email: normalizeEmail(email),
      ...(userId
        ? {
            id: {
              not: userId,
            },
          }
        : null),
    },
    select: { id: true },
  });
}

async function ensureUniqueProfileName(
  companyId: string,
  name: string,
  profileId?: string | null,
) {
  return prisma.accessProfile.findFirst({
    where: {
      id: profileId
        ? {
            not: profileId,
          }
        : undefined,
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
      OR: [{ companyId }, { companyId: null, isSystem: true }],
      code: {
        notIn: Array.from(hiddenSystemProfileCodes),
      },
    },
    select: { id: true },
  });
}

async function getNextProfileSequence(companyId: string) {
  const lastProfile = await prisma.accessProfile.findFirst({
    where: {
      OR: [{ companyId }, { companyId: null, isSystem: true }],
      code: {
        notIn: Array.from(hiddenSystemProfileCodes),
      },
    },
    orderBy: {
      sequenceNumber: "desc",
    },
    select: {
      sequenceNumber: true,
    },
  });

  return (lastProfile?.sequenceNumber ?? 0) + 1;
}

export async function getUserManagementPageData() {
  const context = await requireUserManagementContext();
  const memberships = await prisma.userCompany.findMany({
    where: {
      companyId: context.company.id,
    },
    include: {
      accessProfile: true,
      user: true,
    },
    orderBy: [
      {
        user: {
          fullName: "asc",
        },
      },
      {
        createdAt: "asc",
      },
    ],
  });

  const users: ManagedUserListRow[] = memberships.map((membership) => ({
    accessProfileName: getAccessProfileDisplayName(membership.accessProfile),
    accessProfileTier: membership.accessProfile.tier,
    department: membership.user.department ?? "",
    email: membership.user.email,
    fullName: membership.user.fullName,
    id: membership.user.id,
    isCurrentUser: membership.userId === context.user.id,
    jobTitle: membership.user.jobTitle ?? "",
    lastLoginAt: membership.user.lastLoginAt
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(membership.user.lastLoginAt)
      : "Sem acesso registrado",
    shortName: membership.user.shortName ?? "",
    status: getManagedUserStatus(membership.user.status, membership.isActive),
  }));

  return {
    access: {
      accessProfiles: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.accessProfiles,
      ),
      userAccount: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.userAccount,
      ),
    },
    companyName: context.company.name,
    users,
  } satisfies UserManagementPageData;
}

export async function getUserAccountPageData(userId?: string) {
  const context = await requireUserAccountContext(userId ? "view" : "add");
  let currentMembership = userId
    ? await findMembershipUser(context.company.id, userId)
    : null;

  if (userId && !currentMembership) {
    redirect("/assinante/gestao-acessos");
  }

  const profileOptions = await getProfileOptions(
    context.company.id,
    currentMembership?.accessProfileId,
  );

  currentMembership ||= null;

  return {
    access: {
      userAccount: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.userAccount,
      ),
    },
    canAssignAdministrator: canAssignAdministratorProfile(context.accessProfile.level),
    companyName: context.company.name,
    createdAt: currentMembership ? formatDateBr(currentMembership.user.createdAt) : "",
    isEditMode: Boolean(currentMembership),
    isCurrentUser: currentMembership?.userId === context.user.id,
    profileOptions,
    updatedAt: currentMembership ? formatDateBr(currentMembership.user.updatedAt) : "",
    user: {
      accessProfileId: currentMembership?.accessProfileId ?? profileOptions[0]?.id ?? "",
      department: currentMembership?.user.department ?? "",
      email: currentMembership?.user.email ?? "",
      fullName: currentMembership?.user.fullName ?? "",
      id: currentMembership?.user.id ?? null,
      jobTitle: currentMembership?.user.jobTitle ?? "",
      photoFileName: currentMembership?.user.photoFileName ?? "",
      photoPreviewUrl: buildDataUrl(
        currentMembership?.user.photoMimeType,
        currentMembership?.user.photoData,
      ),
      phone: formatBrazilPhone(currentMembership?.user.phone ?? ""),
      shortName: currentMembership?.user.shortName ?? "",
      status: currentMembership
        ? getManagedUserStatus(currentMembership.user.status, currentMembership.isActive)
        : "PENDING",
    },
  } satisfies UserAccountPageData;
}

export async function saveManagedUser(input: {
  accessProfileId: string;
  department?: string;
  email: string;
  fullName: string;
  jobTitle?: string;
  photoFile?: File | null;
  removePhoto?: boolean;
  phone?: string;
  shortName: string;
  status: UserStatus;
  userId?: string | null;
}) {
  const isEdit = Boolean(input.userId);
  const context = await requireUserAccountContext(isEdit ? "edit" : "add");

  const [membership, profile, existingEmailUser] = await Promise.all([
    input.userId ? findMembershipUser(context.company.id, input.userId) : Promise.resolve(null),
    prisma.accessProfile.findFirst({
      where: {
        id: input.accessProfileId,
        status: "ACTIVE",
        code: {
          notIn: Array.from(hiddenSystemProfileCodes),
        },
        OR: [{ companyId: context.company.id }, { companyId: null, isSystem: true }],
      },
    }),
    ensureUniqueUserEmail(input.email, input.userId),
  ]);

  if (isEdit && !membership) {
    return {
      ok: false as const,
      message: "O usuario informado nao esta vinculado a empresa ativa.",
    };
  }

  if (!profile) {
    return {
      ok: false as const,
      message: "Selecione um perfil de acesso valido para continuar.",
      fieldErrors: {
        accessProfileId: ["Selecione um perfil de acesso valido."],
      },
    };
  }

  if (profile.tier === "ADMINISTRATOR" && !canAssignAdministratorProfile(context.accessProfile.level)) {
    return {
      ok: false as const,
      message:
        "Apenas usuarios com perfil Administrador podem vincular outro usuario a um perfil de nivel Administrador.",
      fieldErrors: {
        accessProfileId: [
          "Apenas usuarios Administrador podem vincular perfis administrativos.",
        ],
      },
    };
  }

  if (existingEmailUser) {
    return {
      ok: false as const,
      message: "Ja existe um usuario cadastrado com este e-mail.",
      fieldErrors: {
        email: ["Ja existe um usuario cadastrado com este e-mail."],
      },
    };
  }

  if (membership?.userId === context.user.id && input.status !== membership.user.status) {
    if (input.status === "BLOCKED" || input.status === "CANCELED") {
      return {
        ok: false as const,
        message: "Nao e permitido bloquear ou cancelar o proprio acesso.",
        fieldErrors: {
          status: ["Nao e permitido bloquear ou cancelar o proprio acesso."],
        },
      };
    }
  }

  if (membership?.userId === context.company.responsibleAdminUserId && input.status === "CANCELED") {
    return {
      ok: false as const,
      message:
        "Altere o administrador responsavel da empresa antes de cancelar este usuario.",
      fieldErrors: {
        status: [
          "Altere o administrador responsavel da empresa antes de cancelar este usuario.",
        ],
      },
    };
  }

  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = onlyDigits(input.phone ?? "");
  const persistedUserStatus = input.status === "CANCELED" ? "ACTIVE" : input.status;
  const isMembershipActive = input.status !== "CANCELED";
  const photoFile =
    input.photoFile instanceof File && input.photoFile.size > 0 ? input.photoFile : null;
  const photoPayload = photoFile
    ? {
        photoData: Buffer.from(await photoFile.arrayBuffer()),
        photoFileName: photoFile.name,
        photoMimeType: photoFile.type || "application/octet-stream",
      }
    : input.removePhoto
      ? {
          photoData: null,
          photoFileName: null,
          photoMimeType: null,
        }
      : {};

  if (!isEdit) {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          department: input.department?.trim() || null,
          email: normalizedEmail,
          fullName: input.fullName.trim(),
          jobTitle: input.jobTitle?.trim() || null,
          mustChangePassword: true,
          passwordHash,
          phone: normalizedPhone || null,
          shortName: input.shortName.trim(),
          status: persistedUserStatus,
          ...photoPayload,
        },
      });

      await tx.userCompany.create({
        data: {
          accessProfileId: profile.id,
          companyId: context.company.id,
          isActive: isMembershipActive,
          isPrimary: true,
          userId: user.id,
        },
      });

      return user;
    });

    return {
      ok: true as const,
      createdUserId: createdUser.id,
      message: "Usuario criado com sucesso.",
      provisionalAccess: {
        email: createdUser.email,
        temporaryPassword,
      },
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: {
        id: membership!.userId,
      },
      data: {
        department: input.department?.trim() || null,
        email: normalizedEmail,
        fullName: input.fullName.trim(),
        jobTitle: input.jobTitle?.trim() || null,
        phone: normalizedPhone || null,
        shortName: input.shortName.trim(),
        status: persistedUserStatus,
        ...photoPayload,
      },
    });

    await tx.userCompany.update({
      where: {
        userId_companyId: {
          companyId: context.company.id,
          userId: membership!.userId,
        },
      },
      data: {
        accessProfileId: profile.id,
        isActive: isMembershipActive,
      },
    });

    return user;
  });

  if (updated.id === context.user.id) {
    await createUserSession({
      ...context.session,
      accessProfileId: profile.id,
      accessProfileName: getAccessProfileDisplayName(profile),
      email: updated.email,
      fullName: updated.fullName,
    });
  }

  return {
    ok: true as const,
    createdUserId: updated.id,
    message: "Conta do usuario atualizada com sucesso.",
    provisionalAccess: null,
  };
}

export async function cancelManagedUser(userId: string) {
  const context = await requireUserAccountContext("delete");

  const membership = await findMembershipUser(context.company.id, userId);

  if (!membership) {
    return {
      ok: false as const,
      message: "O usuario informado nao foi localizado na empresa ativa.",
    };
  }

  if (membership.userId === context.user.id) {
    return {
      ok: false as const,
      message: "Nao e permitido excluir o proprio acesso.",
    };
  }

  if (membership.userId === context.company.responsibleAdminUserId) {
    return {
      ok: false as const,
      message:
        "Altere o administrador responsavel da empresa antes de excluir este usuario.",
    };
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      status: membership.user.status === "BLOCKED" ? "BLOCKED" : "ACTIVE",
    },
  });

  await prisma.userCompany.update({
    where: {
      userId_companyId: {
        companyId: context.company.id,
        userId: membership.userId,
      },
    },
    data: {
      isActive: false,
    },
  });

  return {
    ok: true as const,
    message: "Usuario cancelado com sucesso. O cadastro permanece disponivel para reativacao.",
  };
}

export async function getAccessProfileListPageData() {
  const context = await requireAccessProfileListContext();
  const profiles = await prisma.accessProfile.findMany({
    where: {
      OR: [{ companyId: context.company.id }, { companyId: null, isSystem: true }],
      code: {
        notIn: Array.from(hiddenSystemProfileCodes),
      },
    },
    include: {
      _count: {
        select: {
          userCompanies: {
            where: {
              companyId: context.company.id,
            },
          },
        },
      },
    },
    orderBy: [{ sequenceNumber: "asc" }, { name: "asc" }],
  });

  return {
    access: {
      accessManagement: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.accessManagement,
      ),
      accessProfileEditor: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.accessProfileEditor,
      ),
    },
    companyName: context.company.name,
    profiles: profiles.map((profile) => ({
      code: formatProfileSequence(profile.sequenceNumber),
      createdAt: formatDateBr(profile.createdAt),
      id: profile.id,
      isNative: profile.isSystem,
      isProtected: protectedSystemProfileCodes.has(profile.code),
      linkedUsersCount: profile._count.userCompanies,
      name: getAccessProfileDisplayName(profile),
      status: profile.status,
      tier: profile.tier,
      updatedAt: formatDateBr(profile.updatedAt),
    })),
  } satisfies AccessProfileListPageData;
}

export async function getAccessProfileEditorPageData(profileId?: string) {
  const context = await requireAccessProfileEditorContext(profileId ? "view" : "add");
  const [profile, resources, nextSequence] = await Promise.all([
    profileId ? findEditableProfile(context.company.id, profileId) : Promise.resolve(null),
    prisma.permissionResource.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    profileId ? Promise.resolve(null) : getNextProfileSequence(context.company.id),
  ]);

  if (profileId && !profile) {
    redirect("/assinante/gestao-acessos/perfis");
  }

  const permissionMap = new Map(
    (profile?.accessProfilePermissions ?? []).map((permission) => [
      permission.permissionResource.code,
      permission,
    ]),
  );

  const permissions: PermissionMatrixRow[] = applyPermissionHierarchy(
    resources.map((resource) => {
      const row = permissionMap.get(resource.code);
      const parentName =
        permissionResourceCatalogByCode.get(resource.parentCode as ResourceCode)?.name ?? "";

      return {
        canCreate: row?.canCreate ?? false,
        canDelete: row?.canDelete ?? false,
        canEdit: row?.canEdit ?? false,
        canView: row?.canView ?? false,
        code: resource.code as PermissionMatrixRow["code"],
        id: resource.id,
        isMenuVisible: resource.isMenuVisible,
        module: resource.module ?? "",
        name: resource.name,
        parentCode: resource.parentCode as PermissionMatrixRow["parentCode"],
        parentName,
        route: resource.route ?? "",
        sortOrder: resource.sortOrder,
      };
    }),
  );

  const audit = profile
    ? getAccessProfileAuditLabel(profile)
    : {
        createdByName: "",
        updatedByName: "",
      };

  return {
    access: {
      accessProfileEditor: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.accessProfileEditor,
      ),
    },
    canDelete: profile
      ? !profile.isSystem && !protectedSystemProfileCodes.has(profile.code)
      : false,
    companyName: context.company.name,
    permissionMatrix: permissions,
    profile: {
      code: formatProfileSequence(profile?.sequenceNumber ?? nextSequence ?? 1),
      createdAt: profile ? formatDateBr(profile.createdAt) : "",
      createdByName: audit.createdByName,
      description: profile?.description ?? "",
      id: profile?.id ?? null,
      isNative: profile?.isSystem ?? false,
      isProtected: profile ? protectedSystemProfileCodes.has(profile.code) : false,
      name: profile ? getAccessProfileDisplayName(profile) : "",
      sequenceNumber: profile?.sequenceNumber ?? nextSequence ?? 1,
      status: profile?.status ?? "ACTIVE",
      tier: profile?.tier ?? "BASIC",
      updatedAt: profile ? formatDateBr(profile.updatedAt) : "",
      updatedAtKey: profile?.updatedAt.toISOString() ?? "",
      updatedByName: audit.updatedByName,
    },
  } satisfies AccessProfileEditorPageData;
}

export async function saveAccessProfile(input: {
  description?: string;
  name: string;
  permissions: Array<{
    canCreate: boolean;
    canDelete: boolean;
    canEdit: boolean;
    canView: boolean;
    code: string;
    id: string;
  }>;
  profileId?: string | null;
  status: EntityStatus;
  tier: AccessProfileTier;
}) {
  const isEdit = Boolean(input.profileId);
  const context = await requireAccessProfileEditorContext(isEdit ? "edit" : "add");
  const currentProfile = input.profileId
    ? await findEditableProfile(context.company.id, input.profileId)
    : null;

  if (isEdit && !currentProfile) {
    return {
      ok: false as const,
      message: "O perfil informado nao foi localizado na empresa ativa.",
    };
  }

  if (
    input.tier === "ADMINISTRATOR" &&
    !canAssignAdministratorProfile(context.accessProfile.level)
  ) {
    return {
      ok: false as const,
      message:
        "Apenas usuarios com perfil Administrador podem criar ou editar perfis de nivel Administrador.",
      fieldErrors: {
        tier: [
          "Apenas usuarios Administrador podem trabalhar com perfis de nivel Administrador.",
        ],
      },
    };
  }

  const duplicateProfile = await ensureUniqueProfileName(
    context.company.id,
    input.name,
    input.profileId,
  );

  if (duplicateProfile) {
    return {
      ok: false as const,
      message: "Ja existe um perfil com este nome para a empresa ativa.",
      fieldErrors: {
        name: ["Ja existe um perfil com este nome para a empresa ativa."],
      },
    };
  }

  const normalizedPermissions = applyPermissionHierarchy(
    input.permissions.map((permission) =>
      normalizePermissionBooleans(permission),
    ),
  );
  const nextSequence = isEdit ? currentProfile!.sequenceNumber : await getNextProfileSequence(context.company.id);
  const persistedName =
    currentProfile && protectedSystemProfileCodes.has(currentProfile.code)
      ? getAccessProfileDisplayName(currentProfile)
      : input.name.trim();
  const persistedTier =
    currentProfile && protectedSystemProfileCodes.has(currentProfile.code)
      ? currentProfile.tier
      : input.tier;
  const persistedStatus =
    currentProfile && protectedSystemProfileCodes.has(currentProfile.code)
      ? currentProfile.status
      : input.status;
  const persistedLevel =
    currentProfile && protectedSystemProfileCodes.has(currentProfile.code)
      ? currentProfile.level
      : getDerivedAccessLevel(persistedTier);
  const isAdministrator =
    currentProfile && protectedSystemProfileCodes.has(currentProfile.code)
      ? currentProfile.isAdministrator
      : persistedTier === "ADMINISTRATOR";

  const savedProfile = await prisma.$transaction(async (tx) => {
    const profile =
      currentProfile
        ? await tx.accessProfile.update({
            where: { id: currentProfile.id },
            data: {
              description: input.description?.trim() || null,
              isAdministrator,
              level: persistedLevel,
              name: persistedName,
              status: persistedStatus,
              tier: persistedTier,
              updatedByUserId: context.user.id,
            },
          })
        : await tx.accessProfile.create({
            data: {
              code: `PF-${context.company.slug.toUpperCase()}-${formatProfileSequence(nextSequence)}`,
              companyId: context.company.id,
              createdByUserId: context.user.id,
              description: input.description?.trim() || null,
              isAdministrator,
              isSystem: false,
              level: persistedLevel,
              name: persistedName,
              sequenceNumber: nextSequence,
              status: persistedStatus,
              tier: persistedTier,
              updatedByUserId: context.user.id,
            },
          });

    await tx.accessProfilePermission.deleteMany({
      where: {
        accessProfileId: profile.id,
      },
    });

    if (normalizedPermissions.length > 0) {
      await tx.accessProfilePermission.createMany({
        data: normalizedPermissions.map((permission) => ({
          accessProfileId: profile.id,
          canCreate: permission.canCreate,
          canDelete: permission.canDelete,
          canEdit: permission.canEdit,
          canManage: getManagePermissionValue(
            persistedTier,
            permission.code,
            permission.canView,
          ),
          canView: permission.canView,
          permissionResourceId: permission.id,
        })),
      });
    }

    return profile;
  });

  return {
    ok: true as const,
    message: isEdit ? "Perfil de acesso atualizado com sucesso." : "Perfil de acesso criado com sucesso.",
    savedProfileId: savedProfile.id,
  };
}

export async function deleteAccessProfile(profileId: string) {
  const context = await requireAccessProfileEditorContext("delete");
  const profile = await findEditableProfile(context.company.id, profileId);

  if (!profile) {
    return {
      ok: false as const,
      message: "O perfil informado nao foi localizado.",
    };
  }

  if (profile.isSystem || protectedSystemProfileCodes.has(profile.code)) {
    return {
      ok: false as const,
      message: "Perfis nativos do sistema nao podem ser excluidos.",
    };
  }

  if (profile._count.userCompanies > 0) {
    return {
      ok: false as const,
      message:
        "Nao e possivel excluir este perfil porque existem usuarios vinculados a ele.",
    };
  }

  await prisma.accessProfile.delete({
    where: {
      id: profile.id,
    },
  });

  return {
    ok: true as const,
    message: "Perfil excluido com sucesso.",
  };
}

export function getUserBlockedMessage(status: UserStatus) {
  if (status === "BLOCKED" || status === "CANCELED") {
    return BLOCKED_ACCOUNT_MESSAGE;
  }

  return null;
}

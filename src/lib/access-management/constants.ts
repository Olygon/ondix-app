import type { AccessLevel } from "@prisma/client";

import { RESOURCE_CODES, type ResourceCode } from "@/lib/access-control/resources";

export const accessProfileTierOptions = [
  { value: "BASIC", label: "Basico" },
  { value: "INTERMEDIATE", label: "Intermediario" },
  { value: "ADVANCED", label: "Avancado" },
  { value: "MANAGER", label: "Gestor" },
  { value: "ADMINISTRATOR", label: "Administrador" },
] as const;

export const profileStatusOptions = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
] as const;

export const userStatusOptions = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "PENDING", label: "Pendente" },
  { value: "BLOCKED", label: "Bloqueado" },
  { value: "CANCELED", label: "Cancelado" },
] as const;

export const accessProfileTierLabels = Object.fromEntries(
  accessProfileTierOptions.map((item) => [item.value, item.label]),
) as Record<(typeof accessProfileTierOptions)[number]["value"], string>;

export const profileStatusLabels = Object.fromEntries(
  profileStatusOptions.map((item) => [item.value, item.label]),
) as Record<(typeof profileStatusOptions)[number]["value"], string>;

export const userStatusLabels = Object.fromEntries(
  userStatusOptions.map((item) => [item.value, item.label]),
) as Record<(typeof userStatusOptions)[number]["value"], string>;

export const protectedSystemProfileCodes = new Set(["ADMIN", "OWNER"]);
export const hiddenSystemProfileCodes = new Set(["OWNER"]);
export const nativeSystemAuditLabel = "ONDIX: Nao pode ser excluido";

export const administratorManageResourceCodes = new Set<ResourceCode>([
  RESOURCE_CODES.subscriberCompany,
  RESOURCE_CODES.accessManagement,
  RESOURCE_CODES.accessProfiles,
  RESOURCE_CODES.accessProfileEditor,
  RESOURCE_CODES.subscriptionManagement,
]);

export function formatProfileSequence(sequenceNumber: number) {
  return sequenceNumber.toString().padStart(3, "0");
}

export function isManagerialLevel(level: AccessLevel) {
  return level === "OWNER" || level === "ADMIN" || level === "MANAGER";
}

export function canAssignAdministratorProfile(level: AccessLevel) {
  return level === "OWNER" || level === "ADMIN";
}

export function getDerivedAccessLevel(
  tier: (typeof accessProfileTierOptions)[number]["value"],
): AccessLevel {
  if (tier === "ADMINISTRATOR") {
    return "ADMIN";
  }

  if (tier === "MANAGER") {
    return "MANAGER";
  }

  return "ANALYST";
}

export function getStatusTone(status: string) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "PENDING") {
    return "warning" as const;
  }

  if (status === "BLOCKED" || status === "CANCELED" || status === "INACTIVE") {
    return "error" as const;
  }

  return "info" as const;
}

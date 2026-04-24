import type { EntityStatus, ProvidedServiceStatus } from "@prisma/client";

export const providedServicePageSize = 10;
export const auxiliaryCodePageSize = 10;

export const providedServiceStatusLabels: Record<ProvidedServiceStatus, string> = {
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
};

export const providedServiceStatusOptions: Array<{
  label: string;
  value: ProvidedServiceStatus;
}> = [
  { label: providedServiceStatusLabels.ACTIVE, value: "ACTIVE" },
  { label: providedServiceStatusLabels.BLOCKED, value: "BLOCKED" },
];

export const providedServiceStatusTones: Record<
  ProvidedServiceStatus,
  "error" | "info" | "success" | "warning"
> = {
  ACTIVE: "success",
  BLOCKED: "warning",
};

export const entityStatusLabels: Record<EntityStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const entityStatusOptions: Array<{
  label: string;
  value: EntityStatus;
}> = [
  { label: entityStatusLabels.ACTIVE, value: "ACTIVE" },
  { label: entityStatusLabels.INACTIVE, value: "INACTIVE" },
];

export const entityStatusTones: Record<
  EntityStatus,
  "error" | "info" | "success" | "warning"
> = {
  ACTIVE: "success",
  INACTIVE: "info",
};

export const providedServiceSortFields = [
  "code",
  "name",
  "law116",
  "nbs",
  "costAmount",
  "priceAmount",
  "profitMarginPercent",
  "status",
] as const;

export type ProvidedServiceSortField = (typeof providedServiceSortFields)[number];
export type ServiceSortDirection = "asc" | "desc";

export const auxiliaryCodeSortFields = [
  "code",
  "description",
  "category",
  "status",
] as const;

export type AuxiliaryCodeSortField = (typeof auxiliaryCodeSortFields)[number];

export const serviceAuxiliaryKinds = [
  "law116",
  "nbs",
  "municipalTax",
] as const;

export type ServiceAuxiliaryKind = (typeof serviceAuxiliaryKinds)[number];

export const auxiliaryKindLabels: Record<ServiceAuxiliaryKind, string> = {
  law116: "Lei 116/03",
  municipalTax: "cTribMun",
  nbs: "NBS",
};

export const auxiliaryKindRoutes: Record<ServiceAuxiliaryKind, string> = {
  law116: "/crm/servicos/lei-116",
  municipalTax: "/crm/servicos/ctribmun",
  nbs: "/crm/servicos/nbs",
};

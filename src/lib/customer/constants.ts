import type { CustomerStatus, CustomerType } from "@prisma/client";

export const customerTypeLabels: Record<CustomerType, string> = {
  COMPANY: "Juridica",
  INDIVIDUAL: "Fisica",
};

export const customerTypeOptions: Array<{
  label: string;
  value: CustomerType;
}> = [
  { label: customerTypeLabels.COMPANY, value: "COMPANY" },
  { label: customerTypeLabels.INDIVIDUAL, value: "INDIVIDUAL" },
];

export const customerStatusLabels: Record<CustomerStatus, string> = {
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
  INACTIVE: "Inativo",
};

export const customerStatusOptions: Array<{
  label: string;
  value: CustomerStatus;
}> = [
  { label: customerStatusLabels.ACTIVE, value: "ACTIVE" },
  { label: customerStatusLabels.INACTIVE, value: "INACTIVE" },
  { label: customerStatusLabels.BLOCKED, value: "BLOCKED" },
];

export const customerStatusTones: Record<
  CustomerStatus,
  "error" | "info" | "success" | "warning"
> = {
  ACTIVE: "success",
  BLOCKED: "warning",
  INACTIVE: "info",
};

export const customerContractPlaceholder = {
  contractDueDate: "",
  contractNumber: "Nao vinculado",
  contractPlan: "Sem plano vinculado",
  contractStartDate: "",
};

export const customerPageSize = 10;

export const customerSortFields = [
  "code",
  "type",
  "name",
  "federalDocument",
  "stateCode",
  "status",
] as const;

export type CustomerSortField = (typeof customerSortFields)[number];
export type CustomerSortDirection = "asc" | "desc";

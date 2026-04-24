import type {
  CommercialProposalPaymentMethod,
  CommercialProposalStatus,
} from "@prisma/client";

export const commercialProposalStatusLabels: Record<
  CommercialProposalStatus,
  string
> = {
  APPROVED: "Aprovada",
  CONTRACTED: "Contratada",
  DRAFT: "Em elaboracao",
  EXPIRED: "Expirada",
  INACTIVE: "Inativa",
  REJECTED: "Reprovada",
  SENT: "Enviada",
};

export const commercialProposalStatusOptions: Array<{
  label: string;
  value: CommercialProposalStatus;
}> = [
  { label: commercialProposalStatusLabels.DRAFT, value: "DRAFT" },
  { label: commercialProposalStatusLabels.SENT, value: "SENT" },
  { label: commercialProposalStatusLabels.APPROVED, value: "APPROVED" },
  { label: commercialProposalStatusLabels.CONTRACTED, value: "CONTRACTED" },
  { label: commercialProposalStatusLabels.REJECTED, value: "REJECTED" },
  { label: commercialProposalStatusLabels.EXPIRED, value: "EXPIRED" },
  { label: commercialProposalStatusLabels.INACTIVE, value: "INACTIVE" },
];

export const commercialProposalEditableStatusOptions =
  commercialProposalStatusOptions.filter(
    (option) => option.value !== "CONTRACTED" && option.value !== "INACTIVE",
  );

export const commercialProposalStatusTones: Record<
  CommercialProposalStatus,
  "error" | "info" | "success" | "warning"
> = {
  APPROVED: "success",
  CONTRACTED: "success",
  DRAFT: "info",
  EXPIRED: "warning",
  INACTIVE: "error",
  REJECTED: "error",
  SENT: "warning",
};

export const commercialProposalPaymentMethodLabels: Record<
  CommercialProposalPaymentMethod,
  string
> = {
  CASH: "A vista",
  EXCHANGE: "Permuta",
  INSTALLMENTS: "Parcelado",
};

export const commercialProposalPaymentMethodOptions: Array<{
  label: string;
  value: CommercialProposalPaymentMethod;
}> = [
  { label: commercialProposalPaymentMethodLabels.CASH, value: "CASH" },
  {
    label: commercialProposalPaymentMethodLabels.INSTALLMENTS,
    value: "INSTALLMENTS",
  },
  { label: commercialProposalPaymentMethodLabels.EXCHANGE, value: "EXCHANGE" },
];

export const commercialProposalPageSize = 10;

export const commercialProposalSortFields = [
  "code",
  "customer",
  "createdAt",
  "validUntil",
  "totalAmount",
  "status",
] as const;

export type CommercialProposalSortField =
  (typeof commercialProposalSortFields)[number];
export type CommercialProposalSortDirection = "asc" | "desc";

export const commercialProposalBaseRoute = "/comercial/proposta-comercial";

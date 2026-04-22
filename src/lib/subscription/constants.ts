import type {
  SubscriptionInvoiceStatus,
  SubscriptionPaymentMethod,
  SubscriptionStatus,
} from "@prisma/client";

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: "Ativa",
  BLOCKED: "Bloqueada",
  CANCELED: "Cancelada",
  PENDING: "Pendente",
  SUSPENDED: "Suspensa",
};

export const subscriptionStatusTones: Record<
  SubscriptionStatus,
  "error" | "info" | "success" | "warning"
> = {
  ACTIVE: "success",
  BLOCKED: "error",
  CANCELED: "error",
  PENDING: "warning",
  SUSPENDED: "warning",
};

export const invoiceStatusLabels: Record<SubscriptionInvoiceStatus, string> = {
  CANCELED: "Cancelada",
  OPEN: "Aberta",
  OVERDUE: "Vencida",
  PAID: "Paga",
  PENDING: "Pendente",
};

export const invoiceStatusTones: Record<
  SubscriptionInvoiceStatus,
  "error" | "info" | "success" | "warning"
> = {
  CANCELED: "error",
  OPEN: "info",
  OVERDUE: "error",
  PAID: "success",
  PENDING: "warning",
};

export const paymentMethodLabels: Record<SubscriptionPaymentMethod, string> = {
  BANK_SLIP: "Boleto",
  CREDIT_CARD: "Cartao de credito",
  MANUAL: "Manual",
  PIX: "Pix",
  STRIPE_CHECKOUT: "Stripe Checkout",
};

export const payableInvoiceStatuses = new Set<SubscriptionInvoiceStatus>([
  "OPEN",
  "OVERDUE",
  "PENDING",
]);

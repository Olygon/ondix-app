import type {
  SubscriptionInvoiceStatus,
  SubscriptionPaymentMethod,
  SubscriptionStatus,
} from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";

export type SubscriptionSummaryCard = {
  description?: string;
  label: string;
  tone?: "error" | "info" | "success" | "warning";
  value: string;
};

export type SubscriptionInvoiceRow = {
  amount: string;
  amountValue: number;
  daysPastDue: string;
  dueDate: string;
  id: string;
  isPayable: boolean;
  paymentMethod: SubscriptionPaymentMethod;
  reference: string;
  status: SubscriptionInvoiceStatus;
};

export type SubscriptionNextCharge = {
  amount: string;
  dueDate: string;
  id: string;
  isPayable: boolean;
  paymentMethod: SubscriptionPaymentMethod;
  reference: string;
  status: SubscriptionInvoiceStatus;
} | null;

export type SubscriptionManagementPageData = {
  access: {
    subscriptionManagement: PermissionAccessState;
  };
  companyName: string;
  invoices: SubscriptionInvoiceRow[];
  nextCharge: SubscriptionNextCharge;
  summary: {
    code: string;
    nextChargeAmount: string;
    nextDueDate: string;
    planName: string;
    status: SubscriptionStatus;
    totalOpenAmount: string;
    totalOpenAmountValue: number;
  };
};


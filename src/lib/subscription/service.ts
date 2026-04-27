import "server-only";

import type {
  Company,
  SubscriptionInvoice,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
} from "@prisma/client";

import { formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import { payableInvoiceStatuses } from "@/features/subscription/constants/subscription-constants";
import { getSubscriptionManagementPageDataOrchestration } from "@/features/subscription/server/orchestration/subscription-management";
import { cancelSubscriberSubscriptionOrchestration } from "@/features/subscription/server/orchestration/cancel-subscriber-subscription";
import { prepareSubscriptionPaymentOrchestration } from "@/features/subscription/server/orchestration/prepare-subscription-payment";
import type {
  SubscriptionInvoiceRow,
  SubscriptionNextCharge,
} from "@/features/subscription/types/subscription-types";

type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

type CompanySubscriptionSeed = Pick<
  Company,
  "contractCode" | "id" | "slug" | "subscriptionDate" | "subscriptionPlan" | "subscriptionStatus"
>;

function toCurrency(value?: DecimalLike | number | string | null, currency = "BRL") {
  const amount = toNumber(value);

  return new Intl.NumberFormat("pt-BR", {
    currency,
    style: "currency",
  }).format(amount);
}

function toNumber(value?: DecimalLike | number | string | null) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber?.() ?? Number(value.toString());
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function buildSubscriptionCode(company: CompanySubscriptionSeed) {
  return company.contractCode || `SUB-${company.slug.toUpperCase()}`;
}

function getInvoiceDaysPastDue(
  dueDate: Date,
  status: SubscriptionInvoiceStatus,
) {
  if (!payableInvoiceStatuses.has(status) || dueDate >= startOfToday()) {
    return "";
  }

  const differenceInMs = startOfToday().getTime() - dueDate.getTime();
  const days = Math.max(1, Math.floor(differenceInMs / 86_400_000));

  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

function isInvoicePayable(status: SubscriptionInvoiceStatus) {
  return payableInvoiceStatuses.has(status);
}

function getInvoiceSortWeight(invoice: SubscriptionInvoice) {
  if (
    payableInvoiceStatuses.has(invoice.status) &&
    invoice.dueDate < startOfToday()
  ) {
    return 0;
  }

  if (invoice.status === "OVERDUE") {
    return 0;
  }

  if (payableInvoiceStatuses.has(invoice.status)) {
    return 1;
  }

  if (invoice.status === "PAID") {
    return 2;
  }

  return 3;
}

function mapInvoiceRow(invoice: SubscriptionInvoice): SubscriptionInvoiceRow {
  return {
    amount: toCurrency(invoice.amount, invoice.currency),
    amountValue: toNumber(invoice.amount),
    daysPastDue: getInvoiceDaysPastDue(invoice.dueDate, invoice.status),
    dueDate: formatDateBr(invoice.dueDate),
    id: invoice.id,
    isPayable: isInvoicePayable(invoice.status),
    paymentMethod: invoice.paymentMethod,
    reference: invoice.reference,
    status: invoice.status,
  };
}

function mapNextCharge(
  invoice: SubscriptionInvoice | null,
): SubscriptionNextCharge {
  if (!invoice) {
    return null;
  }

  return {
    amount: toCurrency(invoice.amount, invoice.currency),
    dueDate: formatDateBr(invoice.dueDate),
    id: invoice.id,
    isPayable: isInvoicePayable(invoice.status),
    paymentMethod: invoice.paymentMethod,
    reference: invoice.reference,
    status: invoice.status,
  };
}

async function ensureSubscriberSubscription(company: CompanySubscriptionSeed) {
  const existing = await prisma.subscriberSubscription.findUnique({
    where: { companyId: company.id },
  });
  const code = buildSubscriptionCode(company);
  const planName = company.subscriptionPlan || "Plano Essencial";
  const status = company.subscriptionStatus;

  if (existing) {
    if (
      existing.code !== code ||
      existing.planName !== planName ||
      existing.status !== status
    ) {
      return prisma.subscriberSubscription.update({
        where: { id: existing.id },
        data: {
          code,
          planName,
          status,
        },
      });
    }

    return existing;
  }

  return prisma.subscriberSubscription.create({
    data: {
      code,
      companyId: company.id,
      nextDueDate: addMonths(company.subscriptionDate ?? new Date(), 1),
      planName,
      status,
    },
  });
}

async function markOverdueInvoices(subscriptionId: string, companyId: string) {
  await prisma.subscriptionInvoice.updateMany({
    where: {
      companyId,
      dueDate: {
        lt: startOfToday(),
      },
      status: {
        in: ["OPEN", "PENDING"],
      },
      subscriptionId,
    },
    data: {
      status: "OVERDUE",
    },
  });
}

function findNextCharge(invoices: SubscriptionInvoice[]) {
  const today = startOfToday();
  const upcoming = invoices
    .filter(
      (invoice) =>
        isInvoicePayable(invoice.status) && invoice.dueDate >= today,
    )
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());

  if (upcoming[0]) {
    return upcoming[0];
  }

  return (
    invoices
      .filter((invoice) => isInvoicePayable(invoice.status))
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0] ??
    null
  );
}

export async function getSubscriptionManagementPageData() {
  return getSubscriptionManagementPageDataOrchestration({
    ensureSubscriberSubscription,
    findNextCharge,
    getInvoiceSortWeight,
    isInvoicePayable,
    mapInvoiceRow,
    mapNextCharge,
    markOverdueInvoices,
    toCurrency,
    toNumber,
  });
}

export async function cancelSubscriberSubscription() {
  return cancelSubscriberSubscriptionOrchestration({
    ensureSubscriberSubscription,
  });
}

export async function prepareSubscriptionPayment(invoiceIds: string[]) {
  return prepareSubscriptionPaymentOrchestration(invoiceIds, {
    ensureSubscriberSubscription,
    toNumber,
  });
}

export function getSubscriptionStatusLabel(status: SubscriptionStatus) {
  if (status === "BLOCKED") {
    return "Bloqueada";
  }

  if (status === "CANCELED") {
    return "Cancelada";
  }

  if (status === "PENDING") {
    return "Pendente";
  }

  if (status === "SUSPENDED") {
    return "Suspensa";
  }

  return "Ativa";
}

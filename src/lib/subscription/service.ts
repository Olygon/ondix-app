import "server-only";

import type {
  Company,
  SubscriptionInvoice,
  SubscriptionInvoiceStatus,
  SubscriptionPaymentMethod,
  SubscriptionStatus,
} from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import { payableInvoiceStatuses } from "@/lib/subscription/constants";
import type {
  SubscriptionInvoiceRow,
  SubscriptionManagementPageData,
  SubscriptionNextCharge,
} from "@/lib/subscription/types";

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
  const context = await requirePermission(
    RESOURCE_CODES.subscriptionManagement,
    "view",
  );
  const subscriptionSeed = await ensureSubscriberSubscription(context.company);

  await markOverdueInvoices(subscriptionSeed.id, context.company.id);

  const subscription = await prisma.subscriberSubscription.findUniqueOrThrow({
    where: { id: subscriptionSeed.id },
    include: {
      invoices: true,
    },
  });
  const sortedInvoices = [...subscription.invoices].sort((left, right) => {
    const weightDifference =
      getInvoiceSortWeight(left) - getInvoiceSortWeight(right);

    if (weightDifference !== 0) {
      return weightDifference;
    }

    return left.dueDate.getTime() - right.dueDate.getTime();
  });
  const nextCharge = findNextCharge(subscription.invoices);
  const totalOpenAmount = subscription.invoices
    .filter((invoice) => isInvoicePayable(invoice.status))
    .reduce((total, invoice) => total + toNumber(invoice.amount), 0);
  const nextChargeAmount =
    nextCharge?.amount ?? subscription.nextChargeAmount ?? null;
  const nextDueDate = nextCharge?.dueDate ?? subscription.nextDueDate ?? null;

  return {
    access: {
      subscriptionManagement: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.subscriptionManagement,
      ),
    },
    companyName: context.company.name,
    invoices: sortedInvoices.map(mapInvoiceRow),
    nextCharge: mapNextCharge(nextCharge),
    summary: {
      code: subscription.code,
      nextChargeAmount: nextChargeAmount
        ? toCurrency(nextChargeAmount, subscription.currency)
        : "Sem cobranca agendada",
      nextDueDate: nextDueDate ? formatDateBr(nextDueDate) : "Sem vencimento",
      planName: subscription.planName,
      status: subscription.status,
      totalOpenAmount: toCurrency(totalOpenAmount, subscription.currency),
      totalOpenAmountValue: totalOpenAmount,
    },
  } satisfies SubscriptionManagementPageData;
}

export async function cancelSubscriberSubscription() {
  const context = await requirePermission(
    RESOURCE_CODES.subscriptionManagement,
    "manage",
  );
  const subscription = await ensureSubscriberSubscription(context.company);
  const now = new Date();

  await prisma.$transaction([
    prisma.subscriberSubscription.update({
      where: { id: subscription.id },
      data: {
        canceledAt: now,
        status: "CANCELED",
      },
    }),
    prisma.company.update({
      where: { id: context.company.id },
      data: {
        isActive: true,
        lastEditedAt: now,
        lastEditedByUserId: context.user.id,
        subscriptionStatus: "CANCELED",
      },
    }),
  ]);

  return {
    ok: true as const,
    message:
      "Assinatura cancelada com sucesso. A conta permanece preservada para historico e reativacao futura.",
  };
}

export async function prepareSubscriptionPayment(invoiceIds: string[]) {
  const context = await requirePermission(
    RESOURCE_CODES.subscriptionManagement,
    "edit",
  );
  const uniqueInvoiceIds = Array.from(new Set(invoiceIds.filter(Boolean)));

  if (uniqueInvoiceIds.length === 0) {
    return {
      ok: false as const,
      message: "Selecione ao menos uma fatura em aberto para pagamento.",
    };
  }

  const subscription = await ensureSubscriberSubscription(context.company);
  const invoices = await prisma.subscriptionInvoice.findMany({
    where: {
      companyId: context.company.id,
      id: {
        in: uniqueInvoiceIds,
      },
      status: {
        in: Array.from(payableInvoiceStatuses),
      },
      subscriptionId: subscription.id,
    },
    orderBy: [{ dueDate: "asc" }],
  });

  if (invoices.length !== uniqueInvoiceIds.length) {
    return {
      ok: false as const,
      message:
        "Uma ou mais faturas selecionadas nao estao disponiveis para pagamento.",
    };
  }

  const totalAmount = invoices.reduce(
    (total, invoice) => total + toNumber(invoice.amount),
    0,
  );
  const preferredMethod: SubscriptionPaymentMethod =
    invoices[0]?.paymentMethod ?? "STRIPE_CHECKOUT";
  const payment = await prisma.subscriptionPayment.create({
    data: {
      amount: totalAmount.toFixed(2),
      companyId: context.company.id,
      currency: subscription.currency,
      invoiceLinks: {
        create: invoices.map((invoice) => ({
          amount: invoice.amount.toString(),
          invoiceId: invoice.id,
        })),
      },
      method:
        preferredMethod === "MANUAL" ? "STRIPE_CHECKOUT" : preferredMethod,
      provider: "stripe",
      providerPayload: {
        integrationStatus: "stripe_checkout_pending",
        invoiceIds: invoices.map((invoice) => invoice.id),
      },
      status: "CREATED",
      subscriptionId: subscription.id,
    },
  });

  return {
    ok: true as const,
    message:
      "Solicitacao de pagamento preparada. A criacao da sessao Stripe podera ser conectada neste ponto.",
    paymentAttemptId: payment.id,
  };
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

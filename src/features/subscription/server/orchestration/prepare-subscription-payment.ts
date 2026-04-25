import "server-only";

import type {
  Company,
  SubscriptionPaymentMethod,
} from "@prisma/client";

import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { prisma } from "@/lib/db";
import { payableInvoiceStatuses } from "@/lib/subscription/constants";

type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

type CompanySubscriptionSeed = Pick<
  Company,
  "contractCode" | "id" | "slug" | "subscriptionDate" | "subscriptionPlan" | "subscriptionStatus"
>;

type PrepareSubscriptionPaymentDependencies = {
  ensureSubscriberSubscription: (company: CompanySubscriptionSeed) => Promise<{ id: string; currency: string }>;
  toNumber: (value?: DecimalLike | number | string | null) => number;
};

export async function prepareSubscriptionPaymentOrchestration(
  invoiceIds: string[],
  {
    ensureSubscriberSubscription,
    toNumber,
  }: PrepareSubscriptionPaymentDependencies,
) {
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


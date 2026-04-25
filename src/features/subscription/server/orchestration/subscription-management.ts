import "server-only";

import type {
  Company,
  SubscriptionInvoice,
  SubscriptionInvoiceStatus,
} from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import type {
  SubscriptionInvoiceRow,
  SubscriptionManagementPageData,
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

type SubscriptionManagementOrchestrationDependencies = {
  ensureSubscriberSubscription: (company: CompanySubscriptionSeed) => Promise<{ id: string }>;
  findNextCharge: (invoices: SubscriptionInvoice[]) => SubscriptionInvoice | null;
  getInvoiceSortWeight: (invoice: SubscriptionInvoice) => number;
  isInvoicePayable: (status: SubscriptionInvoiceStatus) => boolean;
  mapInvoiceRow: (invoice: SubscriptionInvoice) => SubscriptionInvoiceRow;
  mapNextCharge: (invoice: SubscriptionInvoice | null) => SubscriptionNextCharge;
  markOverdueInvoices: (subscriptionId: string, companyId: string) => Promise<void>;
  toCurrency: (value?: DecimalLike | number | string | null, currency?: string) => string;
  toNumber: (value?: DecimalLike | number | string | null) => number;
};

export async function getSubscriptionManagementPageDataOrchestration({
  ensureSubscriberSubscription,
  findNextCharge,
  getInvoiceSortWeight,
  isInvoicePayable,
  mapInvoiceRow,
  mapNextCharge,
  markOverdueInvoices,
  toCurrency,
  toNumber,
}: SubscriptionManagementOrchestrationDependencies): Promise<SubscriptionManagementPageData> {
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

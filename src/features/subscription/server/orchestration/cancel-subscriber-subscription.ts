import "server-only";

import type { Company } from "@prisma/client";

import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { prisma } from "@/lib/db";

type CompanySubscriptionSeed = Pick<
  Company,
  "contractCode" | "id" | "slug" | "subscriptionDate" | "subscriptionPlan" | "subscriptionStatus"
>;

type CancelSubscriberSubscriptionDependencies = {
  ensureSubscriberSubscription: (company: CompanySubscriptionSeed) => Promise<{ id: string }>;
};

export async function cancelSubscriberSubscriptionOrchestration({
  ensureSubscriberSubscription,
}: CancelSubscriberSubscriptionDependencies) {
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


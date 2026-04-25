import "server-only";

import type { GovernmentCertificateStatus } from "@prisma/client";

import { cancelActiveCompanySubscriptionOrchestration } from "@/features/subscriber-company/server/orchestration/cancel-active-company-subscription";
import { getSubscriberCompanyPageDataQuery } from "@/features/subscriber-company/server/queries";
import { saveSubscriberCompanyProfileMutation } from "@/features/subscriber-company/server/mutations";
import { prisma } from "@/lib/db";

export async function getSubscriberCompanyPageData() {
  return getSubscriberCompanyPageDataQuery();
}

export async function ensureResponsibleAdminForCompany(userId: string, companyId: string) {
  return prisma.userCompany.findFirst({
    where: {
      companyId,
      isActive: true,
      userId,
      accessProfile: {
        isAdministrator: true,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function ensureUniqueCompanyTaxId(companyId: string, taxId: string) {
  return prisma.company.findFirst({
    where: {
      id: {
        not: companyId,
      },
      taxId,
    },
    select: { id: true },
  });
}

export async function ensureUniqueAdminEmail(userId: string, email: string) {
  return prisma.user.findFirst({
    where: {
      email,
      id: {
        not: userId,
      },
    },
    select: { id: true },
  });
}

export async function saveSubscriberCompanyProfile(input: {
  addressComplement?: string;
  city: string;
  companyEmail: string;
  companyPhone?: string;
  digitalCertificateFile?: File | null;
  digitalCertificatePassword?: string;
  district: string;
  legalName: string;
  logoFile?: File | null;
  managingPartnerName?: string;
  municipalRegistration?: string;
  postalCode: string;
  primaryCnae: string;
  removeLogo?: boolean;
  responsibleAdminEmail: string;
  responsibleAdminName: string;
  responsibleAdminPhone: string;
  responsibleAdminUserId: string;
  secondaryCnae?: string;
  shortName: string;
  stateCode: string;
  stateRegistration?: string;
  street: string;
  streetNumber: string;
  taxId: string;
}) {
  return saveSubscriberCompanyProfileMutation(input, {
    ensureResponsibleAdminForCompany,
    ensureUniqueAdminEmail,
    ensureUniqueCompanyTaxId,
  });
}

export async function cancelActiveCompanySubscription() {
  await cancelActiveCompanySubscriptionOrchestration();
}

export function getCertificateStatusLabel(status: GovernmentCertificateStatus) {
  if (status === "EXPIRED") {
    return "Vencida";
  }

  if (status === "POSITIVE") {
    return "Positiva";
  }

  return "Negativa";
}

export function getSubscriptionStatusLabel(status: string) {
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

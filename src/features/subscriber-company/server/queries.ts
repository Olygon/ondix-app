import "server-only";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import {
  formatBrazilPhone,
  formatCnpj,
  formatDateBr,
  formatDateTimeBr,
  formatPostalCode,
} from "@/lib/formatters/brazil";
import type { SubscriberCompanyPageData } from "@/features/subscriber-company/types/subscriber-company-types";
import { prisma } from "@/lib/db";

function buildDataUrl(
  mimeType?: string | null,
  data?: Uint8Array | Buffer | null,
) {
  if (!mimeType || !data) {
    return null;
  }

  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
}

export async function getSubscriberCompanyPageDataQuery() {
  const context = await requirePermission(RESOURCE_CODES.subscriberCompany, "view");
  const adminMemberships = await prisma.userCompany.findMany({
    where: {
      companyId: context.company.id,
      isActive: true,
      accessProfile: {
        isAdministrator: true,
      },
    },
    include: {
      user: true,
      accessProfile: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  const responsibleAdminMembership =
    adminMemberships.find(
      (membership) => membership.userId === context.company.responsibleAdminUserId,
    ) ?? adminMemberships[0] ?? null;

  return {
    access: {
      accessManagement: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.accessManagement,
      ),
      subscriberCompany: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.subscriberCompany,
      ),
      subscriptionManagement: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.subscriptionManagement,
      ),
    },
    adminOptions: adminMemberships.map((membership) => ({
      accessProfileName: membership.accessProfile.name,
      email: membership.user.email,
      fullName: membership.user.fullName,
      id: membership.user.id,
      phone: formatBrazilPhone(membership.user.phone ?? ""),
    })),
    certificates: context.company.certificates.map((certificate) => ({
      expiresAt: formatDateBr(certificate.expiresAt),
      id: certificate.id,
      name: certificate.name,
      pdfFileName: certificate.pdfFileName ?? "",
      status: certificate.status,
    })),
    company: {
      city: context.company.city ?? "",
      companyEmail: context.company.email ?? "",
      companyPhone: formatBrazilPhone(context.company.phone ?? ""),
      contractCode: context.company.contractCode ?? "",
      digitalCertificateFileName: context.company.digitalCertificateFileName ?? "",
      digitalCertificatePassword: context.company.digitalCertificatePassword ?? "",
      district: context.company.district ?? "",
      legalName: context.company.legalName ?? "",
      lastEditedAt: formatDateTimeBr(context.company.lastEditedAt),
      lastEditedByName: context.company.lastEditedByUser?.fullName ?? "",
      logoFileName: context.company.logoFileName ?? "",
      logoPreviewUrl: buildDataUrl(
        context.company.logoMimeType,
        context.company.logoData,
      ),
      managingPartnerName: context.company.managingPartnerName ?? "",
      municipalRegistration: context.company.municipalRegistration ?? "",
      postalCode: formatPostalCode(context.company.postalCode ?? ""),
      primaryCnae: context.company.primaryCnae ?? "",
      responsibleAdminEmail: responsibleAdminMembership?.user.email ?? "",
      responsibleAdminName: responsibleAdminMembership?.user.fullName ?? "",
      responsibleAdminPhone: formatBrazilPhone(
        responsibleAdminMembership?.user.phone ?? "",
      ),
      responsibleAdminUserId: responsibleAdminMembership?.user.id ?? "",
      secondaryCnae: context.company.secondaryCnae ?? "",
      shortName: context.company.name,
      stateCode: context.company.stateCode ?? "",
      stateRegistration: context.company.stateRegistration ?? "",
      street: context.company.street ?? "",
      streetNumber: context.company.streetNumber ?? "",
      subscriptionDate: formatDateBr(context.company.subscriptionDate),
      subscriptionPlan: context.company.subscriptionPlan ?? "",
      subscriptionStatus: context.company.subscriptionStatus,
      taxId: formatCnpj(context.company.taxId ?? ""),
      addressComplement: context.company.addressComplement ?? "",
    },
  } satisfies SubscriberCompanyPageData;
}


import "server-only";

import type { GovernmentCertificateStatus } from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { createUserSession } from "@/lib/auth/session";
import {
  formatBrazilPhone,
  formatCnpj,
  formatDateBr,
  formatDateTimeBr,
  formatPostalCode,
  onlyDigits,
} from "@/lib/company/formatters";
import type { SubscriberCompanyPageData } from "@/lib/company/types";
import { prisma } from "@/lib/db";
import { cancelSubscriberSubscription } from "@/lib/subscription/service";

function buildDataUrl(
  mimeType?: string | null,
  data?: Uint8Array | Buffer | null,
) {
  if (!mimeType || !data) {
    return null;
  }

  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
}

export async function getSubscriberCompanyPageData() {
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
  const context = await requirePermission(RESOURCE_CODES.subscriberCompany, "edit");
  const normalizedCompanyTaxId = onlyDigits(input.taxId);
  const normalizedPostalCode = onlyDigits(input.postalCode);
  const normalizedStateCode = input.stateCode.trim().toUpperCase();
  const normalizedStateRegistration = input.stateRegistration?.trim().toUpperCase() || null;
  const normalizedCompanyPhone = onlyDigits(input.companyPhone ?? "");
  const normalizedResponsibleAdminPhone = onlyDigits(input.responsibleAdminPhone);
  const normalizedCompanyEmail = input.companyEmail.trim().toLowerCase();
  const normalizedResponsibleAdminEmail = input.responsibleAdminEmail.trim().toLowerCase();
  const safeStateRegistration =
    normalizedStateRegistration &&
    normalizedStateRegistration.length === 2 &&
    normalizedStateRegistration === normalizedStateCode
      ? null
      : input.stateRegistration?.trim() || null;
  const shouldRemoveLogo = Boolean(input.removeLogo) && !input.logoFile;
  const logoFile =
    input.logoFile instanceof File && input.logoFile.size > 0 ? input.logoFile : null;
  const certificateFile =
    input.digitalCertificateFile instanceof File && input.digitalCertificateFile.size > 0
      ? input.digitalCertificateFile
      : null;
  const now = new Date();

  const [existingCompanyTaxId, responsibleAdminMembership, existingAdminEmail] =
    await Promise.all([
      ensureUniqueCompanyTaxId(context.company.id, normalizedCompanyTaxId),
      ensureResponsibleAdminForCompany(
        input.responsibleAdminUserId,
        context.company.id,
      ),
      ensureUniqueAdminEmail(
        input.responsibleAdminUserId,
        normalizedResponsibleAdminEmail,
      ),
    ]);

  if (existingCompanyTaxId) {
    return {
      ok: false as const,
      message: "Ja existe uma empresa cadastrada com este CNPJ.",
      fieldErrors: {
        taxId: ["Ja existe uma empresa cadastrada com este CNPJ."],
      },
    };
  }

  if (!responsibleAdminMembership) {
    return {
      ok: false as const,
      message:
        "O administrador responsavel precisa estar vinculado a empresa com perfil administrativo.",
      fieldErrors: {
        responsibleAdminUserId: [
          "Selecione um usuario administrador vinculado a empresa ativa.",
        ],
      },
    };
  }

  if (existingAdminEmail) {
    return {
      ok: false as const,
      message: "O e-mail informado para o administrador ja esta em uso.",
      fieldErrors: {
        responsibleAdminEmail: [
          "O e-mail informado para o administrador ja esta em uso.",
        ],
      },
    };
  }

  const logoPayload = logoFile
    ? {
        logoData: Buffer.from(await logoFile.arrayBuffer()),
        logoFileName: logoFile.name,
        logoMimeType: logoFile.type || "application/octet-stream",
      }
    : shouldRemoveLogo
      ? {
          logoData: null,
          logoFileName: null,
          logoMimeType: null,
        }
      : {};
  const certificatePayload = certificateFile
    ? {
        digitalCertificateData: Buffer.from(await certificateFile.arrayBuffer()),
        digitalCertificateFileName: certificateFile.name,
        digitalCertificateMimeType:
          certificateFile.type || "application/octet-stream",
      }
    : {};

  const [company, responsibleAdminUser] = await prisma.$transaction(async (tx) => {
    const updatedCompany = await tx.company.update({
      where: { id: context.company.id },
      data: {
        addressComplement: input.addressComplement?.trim() || null,
        city: input.city.trim(),
        digitalCertificatePassword:
          input.digitalCertificatePassword?.trim() || null,
        district: input.district.trim(),
        email: normalizedCompanyEmail,
        isActive: true,
        lastEditedAt: now,
        lastEditedByUserId: context.user.id,
        legalName: input.legalName.trim(),
        managingPartnerName: input.managingPartnerName?.trim() || null,
        municipalRegistration: input.municipalRegistration?.trim() || null,
        name: input.shortName.trim(),
        phone: normalizedCompanyPhone || null,
        postalCode: normalizedPostalCode,
        primaryCnae: input.primaryCnae.trim(),
        responsibleAdminUserId: responsibleAdminMembership.userId,
        secondaryCnae: input.secondaryCnae?.trim() || null,
        stateCode: normalizedStateCode,
        stateRegistration: safeStateRegistration,
        street: input.street.trim(),
        streetNumber: input.streetNumber.trim(),
        subscriptionStatus: context.company.subscriptionStatus,
        taxId: normalizedCompanyTaxId,
        ...logoPayload,
        ...certificatePayload,
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: responsibleAdminMembership.userId },
      data: {
        email: normalizedResponsibleAdminEmail,
        fullName: input.responsibleAdminName.trim(),
        phone: normalizedResponsibleAdminPhone,
      },
    });

    return [updatedCompany, updatedUser] as const;
  });

  await createUserSession({
    ...context.session,
    activeCompanyName: company.name,
    email:
      responsibleAdminUser.id === context.user.id
        ? responsibleAdminUser.email
        : context.session.email,
    fullName:
      responsibleAdminUser.id === context.user.id
        ? responsibleAdminUser.fullName
        : context.session.fullName,
  });

  return {
    ok: true as const,
    message: "Cadastro da empresa atualizado com sucesso.",
  };
}

export async function cancelActiveCompanySubscription() {
  await cancelSubscriberSubscription();
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

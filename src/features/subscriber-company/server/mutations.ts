import "server-only";

import { createUserSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { onlyDigits } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";

type SaveSubscriberCompanyProfileDependencies = {
  ensureResponsibleAdminForCompany: (
    userId: string,
    companyId: string,
  ) => Promise<{ userId: string } | null>;
  ensureUniqueAdminEmail: (
    userId: string,
    email: string,
  ) => Promise<{ id: string } | null>;
  ensureUniqueCompanyTaxId: (
    companyId: string,
    taxId: string,
  ) => Promise<{ id: string } | null>;
};

export async function saveSubscriberCompanyProfileMutation(
  input: {
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
  },
  dependencies: SaveSubscriberCompanyProfileDependencies,
) {
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
      dependencies.ensureUniqueCompanyTaxId(context.company.id, normalizedCompanyTaxId),
      dependencies.ensureResponsibleAdminForCompany(
        input.responsibleAdminUserId,
        context.company.id,
      ),
      dependencies.ensureUniqueAdminEmail(
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


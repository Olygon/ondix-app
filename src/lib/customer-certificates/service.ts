import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type {
  CertificateUploadLink,
  CustomerCertificate,
  CustomerCertificateSituation,
  CustomerCertificateStatus,
  User,
} from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import {
  certificatePdfMaxSizeInBytes,
  certificateUploadLinkDurationDays,
  certificateUploadLinkMaxUploads,
} from "@/lib/customer-certificates/constants";
import { analyzeCertificatePdf } from "@/lib/customer-certificates/pdf";
import type {
  CustomerCertificatePageData,
  CustomerCertificateProcessingLogRow,
  CustomerCertificateRow,
  CustomerCertificateSummary,
  PublicCertificateUploadPageData,
} from "@/lib/customer-certificates/types";
import {
  formatDateBr,
  formatCpfCnpj,
  onlyDigits,
} from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";

type CustomerCertificateWithRelations = CustomerCertificate & {
  uploadedByUser?: Pick<User, "fullName"> | null;
  validatedByUser?: Pick<User, "fullName"> | null;
};

type PublicUploadResult =
  | {
      ok: true;
      certificateId: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

const certificateStorageRoot = path.join(
  process.cwd(),
  "storage",
  "customer-certificates",
);

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function parseDateInput(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getCustomerCertificateRoute(customerId: string) {
  return `/customers/${customerId}/certificates`;
}

function getCustomerCertificateFileRoute(customerId: string, certificateId: string) {
  return `${getCustomerCertificateRoute(customerId)}/${certificateId}/file`;
}

function getCertificateStoragePath(
  companyId: string,
  customerId: string,
  certificateId: string,
) {
  return path.join(certificateStorageRoot, companyId, customerId, `${certificateId}.pdf`);
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 160) || "certidao.pdf"
  );
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

async function buildPublicUploadUrl(token: string) {
  return `${await getAppBaseUrl()}/public/certificates/upload?token=${encodeURIComponent(token)}`;
}

async function findCustomerForCompany(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      deletedAt: null,
      id: customerId,
    },
  });
}

function isExpired(link: Pick<CertificateUploadLink, "expiresAt">) {
  return link.expiresAt.getTime() < Date.now();
}

async function normalizeUploadLinkStatus<T extends CertificateUploadLink | null>(
  link: T,
) {
  if (!link || link.status !== "ACTIVE" || !isExpired(link)) {
    return link;
  }

  await prisma.certificateUploadLink.update({
    data: { status: "EXPIRED" },
    where: { id: link.id },
  });

  return {
    ...link,
    status: "EXPIRED",
  } as T;
}

function isLinkUsable(link: CertificateUploadLink | null) {
  return Boolean(
    link &&
      link.status === "ACTIVE" &&
      !isExpired(link) &&
      link.uploadsUsed < link.maxUploads,
  );
}

function getCertificateStatusAfterManualUpdate(input: {
  detectedSituation: CustomerCertificateSituation;
  expirationDate: Date | null;
}): CustomerCertificateStatus {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  if (input.detectedSituation === "POSITIVE") {
    return "POSITIVE";
  }

  if (input.expirationDate && input.expirationDate < today) {
    return "EXPIRED";
  }

  return "PENDING_VALIDATION";
}

function buildCertificateSummary(
  certificates: CustomerCertificate[],
): CustomerCertificateSummary {
  return {
    expired: certificates.filter((certificate) => certificate.status === "EXPIRED")
      .length,
    pending: certificates.filter((certificate) =>
      ["PENDING_PROCESSING", "PENDING_VALIDATION"].includes(certificate.status),
    ).length,
    positive: certificates.filter(
      (certificate) =>
        certificate.status === "POSITIVE" ||
        certificate.detectedSituation === "POSITIVE",
    ).length,
    total: certificates.length,
    valid: certificates.filter(
      (certificate) =>
        ["PROCESSED", "VALIDATED"].includes(certificate.status) &&
        certificate.detectedSituation !== "POSITIVE",
    ).length,
  };
}

function mapCertificateRow(
  certificate: CustomerCertificateWithRelations,
): CustomerCertificateRow {
  const toDateInput = (date?: Date | null) => date?.toISOString().slice(0, 10) ?? "";

  return {
    certificateType: certificate.certificateType ?? "Nao identificado",
    detectedSituation: certificate.detectedSituation,
    expirationDate: formatDateBr(certificate.expirationDate) || "Nao identificada",
    expirationDateInput: toDateInput(certificate.expirationDate),
    fileName: certificate.fileName ?? "Arquivo PDF",
    fileUrl: certificate.fileUrl,
    id: certificate.id,
    issueDate: formatDateBr(certificate.issueDate) || "Nao identificada",
    issueDateInput: toDateInput(certificate.issueDate),
    issuingAgency: certificate.issuingAgency ?? "Nao identificado",
    notes: certificate.notes ?? "",
    status: certificate.status,
    uploadSource: certificate.uploadSource,
    uploadedAt: formatDateBr(certificate.uploadedAt),
    validatedAt: formatDateBr(certificate.validatedAt),
  };
}

function mapProcessingLogRow(log: {
  confidenceLevel: CustomerCertificateProcessingLogRow["confidenceLevel"];
  createdAt: Date;
  extractedExpirationDate: Date | null;
  extractedIssueDate: Date | null;
  extractedSituation: CustomerCertificateProcessingLogRow["extractedSituation"];
  extractedType: string | null;
  customerCertificateId: string;
  id: string;
  processStatus: CustomerCertificateProcessingLogRow["processStatus"];
}): CustomerCertificateProcessingLogRow {
  return {
    confidenceLevel: log.confidenceLevel,
    createdAt: formatDateBr(log.createdAt),
    customerCertificateId: log.customerCertificateId,
    extractedExpirationDate:
      formatDateBr(log.extractedExpirationDate) || "Nao identificada",
    extractedIssueDate: formatDateBr(log.extractedIssueDate) || "Nao identificada",
    extractedSituation: log.extractedSituation,
    extractedType: log.extractedType ?? "Nao identificado",
    id: log.id,
    processStatus: log.processStatus,
  };
}

function getWhatsappUrl(phone: string, uploadUrl: string) {
  const digits = onlyDigits(phone);

  if (!digits) {
    return "";
  }

  const phoneWithCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Ola, envie sua certidao negativa atraves do link abaixo: ${uploadUrl}`;

  return `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;
}

async function createCertificateFromBuffer(input: {
  buffer: Buffer;
  companyId: string;
  customerId: string;
  fileName: string;
  uploadSource: "EXTERNAL" | "INTERNAL";
  uploadedByUserId?: string | null;
}) {
  const certificateId = randomUUID();
  const fileName = sanitizeFileName(input.fileName);
  const storagePath = getCertificateStoragePath(
    input.companyId,
    input.customerId,
    certificateId,
  );

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, input.buffer);

  const createdCertificate = await prisma.customerCertificate.create({
    data: {
      companyId: input.companyId,
      customerId: input.customerId,
      fileName,
      fileUrl: getCustomerCertificateFileRoute(input.customerId, certificateId),
      id: certificateId,
      status: "PENDING_PROCESSING",
      uploadedByUserId: input.uploadedByUserId ?? null,
      uploadSource: input.uploadSource,
    },
  });

  try {
    const analysis = analyzeCertificatePdf(input.buffer);
    const certificate = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerCertificate.update({
        data: {
          certificateType: analysis.certificateType,
          detectedSituation: analysis.detectedSituation,
          expirationDate: analysis.expirationDate,
          extractedText: analysis.extractedText,
          issueDate: analysis.issueDate,
          issuingAgency: analysis.issuingAgency,
          status: analysis.status,
        },
        where: { id: certificateId },
      });

      await tx.certificateProcessingLog.create({
        data: {
          companyId: input.companyId,
          confidenceLevel: analysis.confidenceLevel,
          customerCertificateId: updated.id,
          extractedExpirationDate: analysis.expirationDate,
          extractedIssueDate: analysis.issueDate,
          extractedSituation: analysis.detectedSituation,
          extractedType: analysis.certificateType,
          processStatus: analysis.processStatus,
        },
      });

      return updated;
    });

    return certificate;
  } catch (error) {
    console.error("[ONDIX certificates] Falha na leitura heuristica do PDF", {
      certificateId,
      error,
    });

    await prisma.$transaction([
      prisma.customerCertificate.update({
        data: {
          notes: "PDF armazenado. Leitura automatica pendente de revisao manual.",
          status: "PENDING_VALIDATION",
        },
        where: { id: certificateId },
      }),
      prisma.certificateProcessingLog.create({
        data: {
          companyId: input.companyId,
          customerCertificateId: certificateId,
          extractedSituation: "UNKNOWN",
          processStatus: "FAILED",
        },
      }),
    ]);

    return createdCertificate;
  }
}

async function findCertificateForCompany(input: {
  certificateId: string;
  companyId: string;
  customerId: string;
}) {
  return prisma.customerCertificate.findFirst({
    where: {
      companyId: input.companyId,
      customerId: input.customerId,
      id: input.certificateId,
      status: {
        not: "DELETED",
      },
    },
  });
}

async function reprocessCertificateRecord(certificate: CustomerCertificate) {
  const storagePath = getCertificateStoragePath(
    certificate.companyId,
    certificate.customerId,
    certificate.id,
  );
  const buffer = await readFile(storagePath);
  const analysis = analyzeCertificatePdf(buffer);

  await prisma.$transaction([
    prisma.customerCertificate.update({
      data: {
        certificateType: analysis.certificateType,
        detectedSituation: analysis.detectedSituation,
        expirationDate: analysis.expirationDate,
        extractedText: analysis.extractedText,
        issueDate: analysis.issueDate,
        issuingAgency: analysis.issuingAgency,
        status: analysis.status,
      },
      where: { id: certificate.id },
    }),
    prisma.certificateProcessingLog.create({
      data: {
        companyId: certificate.companyId,
        confidenceLevel: analysis.confidenceLevel,
        customerCertificateId: certificate.id,
        extractedExpirationDate: analysis.expirationDate,
        extractedIssueDate: analysis.issueDate,
        extractedSituation: analysis.detectedSituation,
        extractedType: analysis.certificateType,
        processStatus: analysis.processStatus,
      },
    }),
  ]);
}

async function getLatestUploadLink(companyId: string, customerId: string) {
  const link = await prisma.certificateUploadLink.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      companyId,
      customerId,
    },
  });

  return normalizeUploadLinkStatus(link);
}

export async function getCustomerCertificatePageData(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "view");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    redirect("/crm/cliente");
  }

  const [certificates, logs, uploadLink] = await Promise.all([
    prisma.customerCertificate.findMany({
      include: {
        uploadedByUser: {
          select: { fullName: true },
        },
        validatedByUser: {
          select: { fullName: true },
        },
      },
      orderBy: [{ uploadedAt: "desc" }],
      where: {
        companyId: context.company.id,
        customerId: customer.id,
        status: {
          not: "DELETED",
        },
      },
    }),
    prisma.certificateProcessingLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 30,
      where: {
        companyId: context.company.id,
        customerCertificate: {
          customerId: customer.id,
          status: {
            not: "DELETED",
          },
        },
      },
    }),
    getLatestUploadLink(context.company.id, customer.id),
  ]);
  const uploadUrl = uploadLink ? await buildPublicUploadUrl(uploadLink.token) : "";

  return {
    access: {
      customers: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmCustomer,
      ),
    },
    certificates: certificates.map(mapCertificateRow),
    companyName: context.company.name,
    customer: {
      contactEmail: customer.email ?? "",
      contactPhone: customer.whatsapp || customer.phone || "",
      document: formatCpfCnpj(customer.federalDocument),
      id: customer.id,
      name: customer.name,
    },
    logs: logs.map(mapProcessingLogRow),
    summary: buildCertificateSummary(certificates),
    uploadLink: uploadLink
      ? {
          expiresAt: formatDateBr(uploadLink.expiresAt),
          id: uploadLink.id,
          maxUploads: uploadLink.maxUploads,
          status: uploadLink.status,
          uploadUrl,
          uploadsUsed: uploadLink.uploadsUsed,
        }
      : null,
  } satisfies CustomerCertificatePageData;
}

export async function generateCustomerCertificateUploadLink(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = addDays(new Date(), certificateUploadLinkDurationDays);

  await prisma.$transaction([
    prisma.certificateUploadLink.updateMany({
      data: {
        revokedAt: new Date(),
        status: "REVOKED",
      },
      where: {
        companyId: context.company.id,
        customerId: customer.id,
        status: "ACTIVE",
      },
    }),
    prisma.certificateUploadLink.create({
      data: {
        companyId: context.company.id,
        createdByUserId: context.user.id,
        customerId: customer.id,
        expiresAt,
        maxUploads: certificateUploadLinkMaxUploads,
        token,
      },
    }),
  ]);

  return {
    ok: true as const,
    message: "Link externo gerado com sucesso.",
    uploadLink: await buildPublicUploadUrl(token),
  };
}

export async function revokeCustomerCertificateUploadLink(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const result = await prisma.certificateUploadLink.updateMany({
    data: {
      revokedAt: new Date(),
      status: "REVOKED",
    },
    where: {
      companyId: context.company.id,
      customerId: customer.id,
      status: "ACTIVE",
    },
  });

  return {
    ok: true as const,
    message:
      result.count > 0
        ? "Link externo revogado com sucesso."
        : "Nao havia link ativo para revogar.",
  };
}

export async function sendCustomerCertificateUploadLinkEmail(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  if (!customer.email) {
    return {
      ok: false as const,
      message: "O cliente nao possui e-mail cadastrado para envio.",
    };
  }

  const uploadLink = await getLatestUploadLink(context.company.id, customer.id);

  if (!isLinkUsable(uploadLink)) {
    return {
      ok: false as const,
      message: "Gere um link ativo antes de enviar por e-mail.",
    };
  }

  const uploadUrl = await buildPublicUploadUrl(uploadLink!.token);

  console.info("[ONDIX certificates] Mock e-mail enviado", {
    customerEmail: customer.email,
    customerId: customer.id,
    message: `Ola, envie sua certidao negativa atraves do link abaixo: ${uploadUrl}`,
  });

  return {
    ok: true as const,
    message: `Envio por e-mail registrado em mock para ${customer.email}.`,
  };
}

export async function getCustomerCertificateWhatsappUrl(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "view");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const uploadLink = await getLatestUploadLink(context.company.id, customer.id);

  if (!isLinkUsable(uploadLink)) {
    return {
      ok: false as const,
      message: "Gere um link ativo antes de enviar por WhatsApp.",
    };
  }

  const whatsappUrl = getWhatsappUrl(
    customer.whatsapp || customer.phone || "",
    await buildPublicUploadUrl(uploadLink!.token),
  );

  if (!whatsappUrl) {
    return {
      ok: false as const,
      message: "O cliente nao possui telefone ou WhatsApp cadastrado.",
    };
  }

  return {
    ok: true as const,
    message: "Link de WhatsApp preparado para envio.",
    whatsappUrl,
  };
}

export async function reprocessCustomerCertificate(input: {
  certificateId: string;
  customerId: string;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const certificate = await findCertificateForCompany({
    certificateId: input.certificateId,
    companyId: context.company.id,
    customerId: input.customerId,
  });

  if (!certificate) {
    return {
      ok: false as const,
      message: "A certidao informada nao foi localizada na empresa ativa.",
    };
  }

  try {
    await reprocessCertificateRecord(certificate);
  } catch {
    await prisma.certificateProcessingLog.create({
      data: {
        companyId: context.company.id,
        customerCertificateId: certificate.id,
        extractedSituation: "UNKNOWN",
        processStatus: "FAILED",
      },
    });

    return {
      ok: false as const,
      message: "Nao foi possivel reler o PDF armazenado para esta certidao.",
    };
  }

  return {
    ok: true as const,
    message: "Certidao reprocessada com sucesso.",
  };
}

export async function reprocessCustomerCertificates(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const certificates = await prisma.customerCertificate.findMany({
    where: {
      companyId: context.company.id,
      customerId: customer.id,
      status: {
        not: "DELETED",
      },
    },
  });

  for (const certificate of certificates) {
    try {
      await reprocessCertificateRecord(certificate);
    } catch {
      await prisma.certificateProcessingLog.create({
        data: {
          companyId: context.company.id,
          customerCertificateId: certificate.id,
          extractedSituation: "UNKNOWN",
          processStatus: "FAILED",
        },
      });
    }
  }

  return {
    ok: true as const,
    message: `${certificates.length} certidao(oes) enviadas para reprocessamento.`,
  };
}

export async function validateCustomerCertificate(input: {
  certificateId: string;
  customerId: string;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const certificate = await findCertificateForCompany({
    certificateId: input.certificateId,
    companyId: context.company.id,
    customerId: input.customerId,
  });

  if (!certificate) {
    return {
      ok: false as const,
      message: "A certidao informada nao foi localizada na empresa ativa.",
    };
  }

  await prisma.customerCertificate.update({
    data: {
      status: "VALIDATED",
      validatedAt: new Date(),
      validatedByUserId: context.user.id,
    },
    where: { id: certificate.id },
  });

  return {
    ok: true as const,
    message: "Certidao validada manualmente.",
  };
}

export async function updateCustomerCertificate(input: {
  certificateId: string;
  certificateType?: string;
  customerId: string;
  detectedSituation: CustomerCertificateSituation;
  expirationDate?: string;
  issueDate?: string;
  issuingAgency?: string;
  notes?: string;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const certificate = await findCertificateForCompany({
    certificateId: input.certificateId,
    companyId: context.company.id,
    customerId: input.customerId,
  });

  if (!certificate) {
    return {
      ok: false as const,
      message: "A certidao informada nao foi localizada na empresa ativa.",
    };
  }

  const expirationDate = parseDateInput(input.expirationDate);

  await prisma.customerCertificate.update({
    data: {
      certificateType: normalizeNullable(input.certificateType),
      detectedSituation: input.detectedSituation,
      expirationDate,
      issueDate: parseDateInput(input.issueDate),
      issuingAgency: normalizeNullable(input.issuingAgency),
      notes: normalizeNullable(input.notes),
      status: getCertificateStatusAfterManualUpdate({
        detectedSituation: input.detectedSituation,
        expirationDate,
      }),
    },
    where: { id: certificate.id },
  });

  return {
    ok: true as const,
    message: "Dados da certidao ajustados com sucesso.",
  };
}

export async function deleteCustomerCertificate(input: {
  certificateId: string;
  customerId: string;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "delete");
  const certificate = await findCertificateForCompany({
    certificateId: input.certificateId,
    companyId: context.company.id,
    customerId: input.customerId,
  });

  if (!certificate) {
    return {
      ok: false as const,
      message: "A certidao informada nao foi localizada na empresa ativa.",
    };
  }

  await prisma.customerCertificate.update({
    data: {
      status: "DELETED",
    },
    where: { id: certificate.id },
  });

  return {
    ok: true as const,
    message: "Certidao removida da gestao interna.",
  };
}

export async function getProtectedCertificateFile(input: {
  certificateId: string;
  customerId: string;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "view");
  const certificate = await findCertificateForCompany({
    certificateId: input.certificateId,
    companyId: context.company.id,
    customerId: input.customerId,
  });

  if (!certificate) {
    return null;
  }

  const storagePath = getCertificateStoragePath(
    context.company.id,
    input.customerId,
    input.certificateId,
  );

  return {
    buffer: await readFile(storagePath),
    fileName: certificate.fileName ?? "certidao.pdf",
  };
}

async function findUploadLinkByToken(token: string) {
  const link = await prisma.certificateUploadLink.findUnique({
    include: {
      customer: true,
    },
    where: { token },
  });

  if (!link) {
    return null;
  }

  return normalizeUploadLinkStatus(link);
}

export async function getPublicCertificateUploadPageData(
  token: string,
): Promise<PublicCertificateUploadPageData> {
  if (!token) {
    return {
      error: "Link de envio nao informado.",
      isValid: false,
      token,
    };
  }

  const link = await findUploadLinkByToken(token);

  if (!link) {
    return {
      error: "Link de envio invalido.",
      isValid: false,
      token,
    };
  }

  if (!isLinkUsable(link)) {
    return {
      customerName: link.customer.name,
      error: "Este link expirou, foi revogado ou atingiu o limite de uploads.",
      isValid: false,
      token,
    };
  }

  return {
    customerName: link.customer.name,
    isValid: true,
    token,
  };
}

export async function uploadCustomerCertificateFromPublicLink(input: {
  file: File | null;
  token: string;
}): Promise<PublicUploadResult> {
  const link = await findUploadLinkByToken(input.token);

  if (!link || !isLinkUsable(link)) {
    return {
      ok: false,
      code: "invalid-link",
      message: "Link invalido, expirado ou sem uploads disponiveis.",
    };
  }

  if (!input.file || input.file.size === 0) {
    return {
      ok: false,
      code: "missing-file",
      message: "Selecione um arquivo PDF para enviar.",
    };
  }

  if (!isPdfFile(input.file)) {
    return {
      ok: false,
      code: "invalid-file",
      message: "Envie apenas arquivos PDF.",
    };
  }

  if (input.file.size > certificatePdfMaxSizeInBytes) {
    return {
      ok: false,
      code: "file-too-large",
      message: "O PDF deve ter no maximo 5MB.",
    };
  }

  const updateResult = await prisma.certificateUploadLink.updateMany({
    data: {
      uploadsUsed: {
        increment: 1,
      },
    },
    where: {
      expiresAt: {
        gte: new Date(),
      },
      id: link.id,
      status: "ACTIVE",
      uploadsUsed: {
        lt: link.maxUploads,
      },
    },
  });

  if (updateResult.count !== 1) {
    return {
      ok: false,
      code: "upload-limit",
      message: "O limite de uploads deste link foi atingido.",
    };
  }

  try {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const certificate = await createCertificateFromBuffer({
      buffer,
      companyId: link.companyId,
      customerId: link.customerId,
      fileName: input.file.name,
      uploadSource: "EXTERNAL",
    });

    return {
      ok: true,
      certificateId: certificate.id,
    };
  } catch {
    await prisma.certificateUploadLink.update({
      data: {
        uploadsUsed: {
          decrement: 1,
        },
      },
      where: { id: link.id },
    });

    return {
      ok: false,
      code: "processing-failed",
      message: "Nao foi possivel armazenar e ler o PDF enviado.",
    };
  }
}

export { getCustomerCertificateRoute };

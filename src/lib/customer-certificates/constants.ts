import type {
  CertificateConfidenceLevel,
  CertificateProcessingStatus,
  CertificateUploadLinkStatus,
  CustomerCertificateSituation,
  CustomerCertificateStatus,
} from "@prisma/client";

export const certificateUploadLinkDurationDays = 7;
export const certificateUploadLinkMaxUploads = 5;
export const certificatePdfMaxSizeInBytes = 5 * 1024 * 1024;

export const customerCertificateStatusLabels: Record<
  CustomerCertificateStatus,
  string
> = {
  DELETED: "Excluida",
  EXPIRED: "Vencida",
  PENDING_PROCESSING: "Pendente de leitura",
  PENDING_VALIDATION: "Pendente de validacao",
  POSITIVE: "Positiva",
  PROCESSED: "Processada",
  VALIDATED: "Validada",
};

export const customerCertificateStatusTones: Record<
  CustomerCertificateStatus,
  "error" | "info" | "success" | "warning"
> = {
  DELETED: "error",
  EXPIRED: "warning",
  PENDING_PROCESSING: "info",
  PENDING_VALIDATION: "warning",
  POSITIVE: "error",
  PROCESSED: "info",
  VALIDATED: "success",
};

export const customerCertificateSituationLabels: Record<
  CustomerCertificateSituation,
  string
> = {
  NEGATIVE: "Certidao negativa",
  POSITIVE: "Positiva",
  POSITIVE_WITH_NEGATIVE_EFFECTS: "Positiva com efeitos de negativa",
  UNKNOWN: "Nao identificada",
};

export const customerCertificateSituationTones: Record<
  CustomerCertificateSituation,
  "error" | "info" | "success" | "warning"
> = {
  NEGATIVE: "success",
  POSITIVE: "error",
  POSITIVE_WITH_NEGATIVE_EFFECTS: "warning",
  UNKNOWN: "info",
};

export const certificateUploadLinkStatusLabels: Record<
  CertificateUploadLinkStatus,
  string
> = {
  ACTIVE: "Ativo",
  EXPIRED: "Expirado",
  REVOKED: "Revogado",
};

export const certificateUploadLinkStatusTones: Record<
  CertificateUploadLinkStatus,
  "error" | "info" | "success" | "warning"
> = {
  ACTIVE: "success",
  EXPIRED: "warning",
  REVOKED: "error",
};

export const certificateProcessingStatusLabels: Record<
  CertificateProcessingStatus,
  string
> = {
  FAILED: "Falha",
  PENDING_VALIDATION: "Pendente de validacao",
  PROCESSED: "Processado",
};

export const certificateConfidenceLevelLabels: Record<
  CertificateConfidenceLevel,
  string
> = {
  HIGH: "Alta",
  LOW: "Baixa",
  MEDIUM: "Media",
};

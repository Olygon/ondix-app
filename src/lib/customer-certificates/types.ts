import type {
  CertificateConfidenceLevel,
  CertificateProcessingStatus,
  CertificateUploadLinkStatus,
  CustomerCertificateSituation,
  CustomerCertificateStatus,
  CertificateUploadSource,
} from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";

export type CustomerCertificateSummary = {
  expired: number;
  pending: number;
  positive: number;
  total: number;
  valid: number;
};

export type CustomerCertificateUploadLinkView = {
  expiresAt: string;
  id: string;
  maxUploads: number;
  status: CertificateUploadLinkStatus;
  uploadUrl: string;
  uploadsUsed: number;
} | null;

export type CustomerCertificateRow = {
  certificateType: string;
  detectedSituation: CustomerCertificateSituation;
  expirationDate: string;
  expirationDateInput: string;
  fileName: string;
  fileUrl: string | null;
  id: string;
  issueDate: string;
  issueDateInput: string;
  issuingAgency: string;
  notes: string;
  status: CustomerCertificateStatus;
  uploadSource: CertificateUploadSource;
  uploadedAt: string;
  validatedAt: string;
};

export type CustomerCertificateProcessingLogRow = {
  confidenceLevel: CertificateConfidenceLevel;
  createdAt: string;
  customerCertificateId: string;
  extractedExpirationDate: string;
  extractedIssueDate: string;
  extractedSituation: CustomerCertificateSituation;
  extractedType: string;
  id: string;
  processStatus: CertificateProcessingStatus;
};

export type CustomerCertificatePageData = {
  access: {
    customers: PermissionAccessState;
  };
  certificates: CustomerCertificateRow[];
  companyName: string;
  customer: {
    contactEmail: string;
    contactPhone: string;
    document: string;
    id: string;
    name: string;
  };
  logs: CustomerCertificateProcessingLogRow[];
  summary: CustomerCertificateSummary;
  uploadLink: CustomerCertificateUploadLinkView;
};

export type PublicCertificateUploadPageData = {
  customerName?: string;
  error?: string;
  isValid: boolean;
  token: string;
};

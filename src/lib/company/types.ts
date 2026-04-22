import type { GovernmentCertificateStatus, SubscriptionStatus } from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";

export type SubscriberAdminOption = {
  accessProfileName: string;
  email: string;
  fullName: string;
  id: string;
  phone: string;
};

export type SubscriberCertificateRow = {
  expiresAt: string;
  id: string;
  name: string;
  pdfFileName: string;
  status: GovernmentCertificateStatus;
};

export type SubscriberCompanyPageData = {
  access: {
    accessManagement: PermissionAccessState;
    subscriberCompany: PermissionAccessState;
    subscriptionManagement: PermissionAccessState;
  };
  adminOptions: SubscriberAdminOption[];
  certificates: SubscriberCertificateRow[];
  company: {
    addressComplement: string;
    city: string;
    companyEmail: string;
    companyPhone: string;
    contractCode: string;
    digitalCertificateFileName: string;
    digitalCertificatePassword: string;
    district: string;
    lastEditedAt: string;
    lastEditedByName: string;
    legalName: string;
    logoFileName: string;
    logoPreviewUrl: string | null;
    managingPartnerName: string;
    municipalRegistration: string;
    postalCode: string;
    primaryCnae: string;
    responsibleAdminEmail: string;
    responsibleAdminName: string;
    responsibleAdminPhone: string;
    responsibleAdminUserId: string;
    secondaryCnae: string;
    shortName: string;
    stateCode: string;
    stateRegistration: string;
    street: string;
    streetNumber: string;
    subscriptionDate: string;
    subscriptionPlan: string;
    subscriptionStatus: SubscriptionStatus;
    taxId: string;
  };
};

import type { EntityStatus, ProvidedServiceStatus } from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";
import type {
  AuxiliaryCodeSortField,
  ProvidedServiceSortField,
  ServiceAuxiliaryKind,
  ServiceSortDirection,
} from "@/features/services/constants/service-constants";

export type PaginationData = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProvidedServiceListFilters = {
  direction: ServiceSortDirection;
  page: number;
  search: string;
  sort: ProvidedServiceSortField;
  status: ProvidedServiceStatus | "";
};

export type ProvidedServiceListRow = {
  code: string;
  costAmount: string;
  description: string;
  id: string;
  law116: string;
  name: string;
  nbs: string;
  priceAmount: string;
  profitMarginPercent: string;
  status: ProvidedServiceStatus;
};

export type ProvidedServiceListPageData = {
  access: {
    services: PermissionAccessState;
  };
  companyName: string;
  filters: ProvidedServiceListFilters;
  pagination: PaginationData;
  services: ProvidedServiceListRow[];
};

export type ServiceOption = {
  id: string;
  label: string;
  status: EntityStatus;
};

export type MunicipalTaxCodeOption = ServiceOption & {
  defaultIssRate: string;
  municipalityIbgeCode: string;
  municipalityName: string;
  stateCode: string;
};

export type MunicipalityOption = {
  ibgeCode: string;
  label: string;
  name: string;
  stateCode: string;
};

export type ServiceMunicipalTaxRuleRow = {
  cTribMun: string;
  description: string;
  id: string;
  isDefault: boolean;
  issRate: string;
  municipalTaxCodeId: string;
  municipalityIbgeCode: string;
  municipalityName: string;
  notes: string;
};

export type ProvidedServiceFormValues = {
  administrativeCostPercent: string;
  code: string;
  commissionPercent: string;
  costAmount: string;
  description: string;
  id: string | null;
  name: string;
  priceAmount: string;
  profitMarginPercent: string;
  serviceLaw116Id: string;
  serviceNbsId: string;
  status: ProvidedServiceStatus;
  taxCbsPercent: string;
  taxCidPercent: string;
  taxCofinsPercent: string;
  taxCsllPercent: string;
  taxIbsPercent: string;
  taxIcmsPercent: string;
  taxIpiPercent: string;
  taxIrpjPercent: string;
  taxPisPercent: string;
  taxSimpleNationalPercent: string;
};

export type ProvidedServiceFormPageData = {
  access: {
    services: PermissionAccessState;
  };
  companyName: string;
  createdAt: string;
  createdByName: string;
  isEditMode: boolean;
  law116Options: ServiceOption[];
  municipalTaxCodeOptions: MunicipalTaxCodeOption[];
  nbsOptions: ServiceOption[];
  service: ProvidedServiceFormValues;
  taxRules: ServiceMunicipalTaxRuleRow[];
  updatedAt: string;
  updatedByName: string;
};

export type AuxiliaryCodeListFilters = {
  direction: ServiceSortDirection;
  page: number;
  search: string;
  sort: AuxiliaryCodeSortField;
  status: EntityStatus | "";
};

export type AuxiliaryCodeListRow = {
  category: string;
  code: string;
  defaultIssRate?: string;
  description: string;
  id: string;
  municipalityIbgeCode?: string;
  municipalityName?: string;
  stateCode?: string;
  requiresConstruction?: boolean;
  requiresEvent?: boolean;
  requiresProperty?: boolean;
  status: EntityStatus;
};

export type AuxiliaryCodeListPageData = {
  access: {
    services: PermissionAccessState;
  };
  filters: AuxiliaryCodeListFilters;
  kind: ServiceAuxiliaryKind;
  pagination: PaginationData;
  rows: AuxiliaryCodeListRow[];
};

export type AuxiliaryCodeFormValues = {
  category: string;
  code: string;
  defaultIssRate: string;
  description: string;
  id: string | null;
  municipalityIbgeCode: string;
  municipalityName: string;
  stateCode: string;
  requiresConstruction: boolean;
  requiresEvent: boolean;
  requiresProperty: boolean;
  status: EntityStatus;
};

export type AuxiliaryCodeFormPageData = {
  access: {
    services: PermissionAccessState;
  };
  auxiliaryCode: AuxiliaryCodeFormValues;
  isEditMode: boolean;
  kind: ServiceAuxiliaryKind;
  municipalityOptions: MunicipalityOption[];
};

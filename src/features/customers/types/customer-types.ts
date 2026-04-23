import type { CustomerStatus, CustomerType } from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";
import type {
  CustomerSortDirection,
  CustomerSortField,
} from "@/features/customers/constants/customer-constants";
import type { PaginationData } from "@/types/pagination";

export type CustomerListFilters = {
  contractDuePeriod: string;
  direction: CustomerSortDirection;
  federalDocument: string;
  name: string;
  page: number;
  plan: string;
  sort: CustomerSortField;
  status: CustomerStatus | "";
  type: CustomerType | "";
};

export type CustomerListRow = {
  code: string;
  contractNumber: string;
  federalDocument: string;
  id: string;
  name: string;
  stateCode: string;
  status: CustomerStatus;
  type: CustomerType;
};

export type CustomerListPageData = {
  access: {
    customers: PermissionAccessState;
  };
  companyName: string;
  customers: CustomerListRow[];
  filters: CustomerListFilters;
  pagination: PaginationData;
};

export type CustomerFormValues = {
  addressComplement: string;
  city: string;
  cityDocument: string;
  code: string;
  contractDueDate: string;
  contractNumber: string;
  contractPlan: string;
  contractStartDate: string;
  email: string;
  federalDocument: string;
  id: string | null;
  name: string;
  neighborhood: string;
  phone: string;
  postalCode: string;
  stateCode: string;
  stateDocument: string;
  status: CustomerStatus;
  street: string;
  streetNumber: string;
  type: CustomerType;
  whatsapp: string;
  whatsappReminderEnabled: boolean;
};

export type CustomerFormPageData = {
  access: {
    customers: PermissionAccessState;
  };
  companyName: string;
  createdAt: string;
  createdByName: string;
  customer: CustomerFormValues;
  isEditMode: boolean;
  updatedAt: string;
  updatedByName: string;
};

import type {
  CommercialProposalPaymentMethod,
  CommercialProposalStatus,
} from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";
import type {
  CommercialProposalSortDirection,
  CommercialProposalSortField,
} from "@/features/commercial-proposals/constants/commercial-proposal-constants";

export type CommercialProposalListFilters = {
  createdFrom: string;
  createdTo: string;
  customerId: string;
  direction: CommercialProposalSortDirection;
  page: number;
  search: string;
  sort: CommercialProposalSortField;
  status: CommercialProposalStatus | "";
};

export type CommercialProposalListRow = {
  code: string;
  contractId: string;
  createdAt: string;
  customerName: string;
  id: string;
  status: CommercialProposalStatus;
  totalAmount: string;
  validUntil: string;
};

export type CommercialProposalCustomerOption = {
  document: string;
  email: string;
  id: string;
  label: string;
  name: string;
};

export type CommercialProposalServiceOption = {
  code: string;
  description: string;
  id: string;
  label: string;
  name: string;
  priceAmount: string;
};

export type CommercialProposalListPageData = {
  access: {
    proposals: PermissionAccessState;
  };
  canApprove: boolean;
  companyName: string;
  customerOptions: CommercialProposalCustomerOption[];
  filters: CommercialProposalListFilters;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  proposals: CommercialProposalListRow[];
};

export type CommercialProposalItemFormValues = {
  id: string | null;
  lineDiscountAmount: string;
  lineDiscountPercent: string;
  lineSubtotalAmount: string;
  lineTotalAmount: string;
  quantity: string;
  serviceCodeSnapshot: string;
  serviceDescriptionSnapshot: string;
  serviceId: string;
  serviceNameSnapshot: string;
  sortOrder: number;
  unitPriceAmount: string;
};

export type CommercialProposalFormValues = {
  approvedAt: string;
  approvedByName: string;
  code: string;
  contractId: string;
  customerId: string;
  deliveryCostAmount: string;
  deliveryDeadline: string;
  downPaymentAmount: string;
  globalDiscountAmount: string;
  id: string | null;
  issueDate: string;
  materialCostAmount: string;
  notes: string;
  otherCostAmount: string;
  paymentMethod: CommercialProposalPaymentMethod;
  status: CommercialProposalStatus;
  subtotalAmount: string;
  totalDiscountAmount: string;
  totalAmount: string;
  validUntil: string;
};

export type CommercialProposalFormPageData = {
  access: {
    proposals: PermissionAccessState;
  };
  canApprove: boolean;
  companyName: string;
  createdAt: string;
  createdByName: string;
  currentUserName: string;
  customerOptions: CommercialProposalCustomerOption[];
  isEditMode: boolean;
  proposal: CommercialProposalFormValues;
  serviceOptions: CommercialProposalServiceOption[];
  items: CommercialProposalItemFormValues[];
  updatedAt: string;
  updatedByName: string;
};

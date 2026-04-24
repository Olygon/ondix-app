import "server-only";

import type {
  CommercialProposalPaymentMethod,
  CommercialProposalStatus,
} from "@prisma/client";

import type {
  CommercialProposalFormPageData,
  CommercialProposalListPageData,
} from "@/features/commercial-proposals/types/commercial-proposal-types";
import {
  approveCommercialProposal as approveCommercialProposalFromMutations,
  deleteCommercialProposal as deleteCommercialProposalFromMutations,
  generateContractFromCommercialProposal as generateContractFromCommercialProposalFromMutations,
  inactivateCommercialProposal as inactivateCommercialProposalFromMutations,
  saveCommercialProposal as saveCommercialProposalFromMutations,
  sendCommercialProposalByEmail as sendCommercialProposalByEmailFromMutations,
} from "@/features/commercial-proposals/server/mutations";
import {
  getCommercialProposalFormPageData as getCommercialProposalFormPageDataFromQueries,
  getCommercialProposalListPageData as getCommercialProposalListPageDataFromQueries,
  getCommercialProposalPdfPayload as getCommercialProposalPdfPayloadFromQueries,
  type CommercialProposalSearchParams,
} from "@/features/commercial-proposals/server/queries";

export type { CommercialProposalSearchParams } from "@/features/commercial-proposals/server/queries";

export type CommercialProposalWriteInput = {
  customerId: string;
  deliveryCostAmount: string;
  deliveryDeadline?: string;
  downPaymentAmount: string;
  globalDiscountAmount: string;
  issueDate: string;
  items: Array<{
    id?: string | null;
    lineDiscountAmount: string;
    lineDiscountPercent: string;
    quantity: string;
    serviceCodeSnapshot: string;
    serviceDescriptionSnapshot: string;
    serviceId: string;
    serviceNameSnapshot: string;
    sortOrder?: number;
    unitPriceAmount: string;
  }>;
  materialCostAmount: string;
  notes?: string;
  otherCostAmount: string;
  paymentMethod: CommercialProposalPaymentMethod;
  proposalId?: string | null;
  status: CommercialProposalStatus;
  validUntil: string;
};

export type CommercialProposalPdfPayload = {
  company: {
    city: string;
    email: string;
    legalName: string;
    name: string;
    phone: string;
    stateCode: string;
    street: string;
    taxId: string;
  };
  customer: {
    city: string;
    document: string;
    email: string;
    name: string;
    phone: string;
    stateCode: string;
    street: string;
  };
  items: Array<{
    code: string;
    description: string;
    discountAmount: string;
    quantity: string;
    totalAmount: string;
    unitPrice: string;
  }>;
  proposal: {
    code: string;
    deliveryCostAmount: string;
    deliveryDeadline: string;
    downPaymentAmount: string;
    globalDiscountAmount: string;
    issueDate: string;
    materialCostAmount: string;
    notes: string;
    otherCostAmount: string;
    paymentMethod: string;
    status: string;
    subtotalAmount: string;
    totalAmount: string;
    totalDiscountAmount: string;
    validUntil: string;
  };
};

export async function getCommercialProposalListPageData(
  searchParams?: CommercialProposalSearchParams,
): Promise<CommercialProposalListPageData> {
  return getCommercialProposalListPageDataFromQueries(searchParams);
}

export async function getCommercialProposalFormPageData(
  proposalId?: string,
): Promise<CommercialProposalFormPageData> {
  return getCommercialProposalFormPageDataFromQueries(proposalId);
}

export async function saveCommercialProposal(input: CommercialProposalWriteInput) {
  return saveCommercialProposalFromMutations(input);
}

export async function deleteCommercialProposal(proposalId: string) {
  return deleteCommercialProposalFromMutations(proposalId);
}

export async function inactivateCommercialProposal(proposalId: string) {
  return inactivateCommercialProposalFromMutations(proposalId);
}

export async function approveCommercialProposal(proposalId: string) {
  return approveCommercialProposalFromMutations(proposalId);
}

export async function sendCommercialProposalByEmail(proposalId: string) {
  return sendCommercialProposalByEmailFromMutations(proposalId);
}

export async function generateContractFromCommercialProposal(proposalId: string) {
  return generateContractFromCommercialProposalFromMutations(proposalId);
}

export async function getCommercialProposalPdfPayload(
  proposalId: string,
): Promise<CommercialProposalPdfPayload | null> {
  return getCommercialProposalPdfPayloadFromQueries(proposalId);
}

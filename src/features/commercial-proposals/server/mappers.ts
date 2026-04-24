import "server-only";

import type {
  CommercialProposal,
  CommercialProposalItem,
  Customer,
  ProvidedService,
  User,
} from "@prisma/client";

import type {
  CommercialProposalCustomerOption,
  CommercialProposalFormValues,
  CommercialProposalItemFormValues,
  CommercialProposalListRow,
  CommercialProposalServiceOption,
} from "@/features/commercial-proposals/types/commercial-proposal-types";
import { formatCpfCnpj, formatDateBr } from "@/lib/formatters/brazil";
import {
  addDays,
  formatProposalCode,
  formatServiceCode,
  toCurrency,
  toDateInput,
  toDecimalInput,
} from "@/features/commercial-proposals/server/helpers";

export function mapCustomerOption(customer: Customer): CommercialProposalCustomerOption {
  return {
    document: formatCpfCnpj(customer.federalDocument),
    email: customer.email ?? "",
    id: customer.id,
    label: `${customer.name} - ${formatCpfCnpj(customer.federalDocument)}`,
    name: customer.name,
  };
}

export function mapServiceOption(service: ProvidedService): CommercialProposalServiceOption {
  const code = formatServiceCode(service.code);

  return {
    code,
    description: service.description,
    id: service.id,
    label: `${code} - ${service.name}`,
    name: service.name,
    priceAmount: toDecimalInput(service.priceAmount),
  };
}

export function mapListRow(
  proposal: CommercialProposal & {
    customer: Customer;
  },
): CommercialProposalListRow {
  return {
    code: formatProposalCode(proposal.code),
    contractId: proposal.contractId ?? "",
    createdAt: formatDateBr(proposal.createdAt),
    customerName: proposal.customer.name,
    id: proposal.id,
    status: proposal.status,
    totalAmount: toCurrency(proposal.totalAmount),
    validUntil: formatDateBr(proposal.validUntil),
  };
}

export function mapProposalFormValues(
  proposal: (CommercialProposal & {
    approvedBy?: Pick<User, "fullName"> | null;
  }) | null,
  code: number,
): CommercialProposalFormValues {
  const today = new Date();
  const validUntil = addDays(today, 15);

  return {
    approvedAt: proposal ? formatDateBr(proposal.approvedAt) : "",
    approvedByName: proposal?.approvedBy?.fullName ?? "",
    code: formatProposalCode(proposal?.code ?? code),
    contractId: proposal?.contractId ?? "",
    customerId: proposal?.customerId ?? "",
    deliveryCostAmount: toDecimalInput(proposal?.deliveryCostAmount),
    deliveryDeadline: proposal?.deliveryDeadline ?? "",
    downPaymentAmount: toDecimalInput(proposal?.downPaymentAmount),
    globalDiscountAmount: toDecimalInput(proposal?.globalDiscountAmount),
    id: proposal?.id ?? null,
    issueDate: toDateInput(proposal?.issueDate ?? today),
    materialCostAmount: toDecimalInput(proposal?.materialCostAmount),
    notes: proposal?.notes ?? "",
    otherCostAmount: toDecimalInput(proposal?.otherCostAmount),
    paymentMethod: proposal?.paymentMethod ?? "CASH",
    status: proposal?.status ?? "DRAFT",
    subtotalAmount: toDecimalInput(proposal?.subtotalAmount),
    totalDiscountAmount: toDecimalInput(proposal?.totalDiscountAmount),
    totalAmount: toDecimalInput(proposal?.totalAmount),
    validUntil: toDateInput(proposal?.validUntil ?? validUntil),
  };
}

function emptyItemFormValues(): CommercialProposalItemFormValues {
  return {
    id: null,
    lineDiscountAmount: "0",
    lineDiscountPercent: "0",
    lineSubtotalAmount: "0",
    lineTotalAmount: "0",
    quantity: "1",
    serviceCodeSnapshot: "",
    serviceDescriptionSnapshot: "",
    serviceId: "",
    serviceNameSnapshot: "",
    sortOrder: 0,
    unitPriceAmount: "0",
  };
}

export function mapProposalItemFormValues(
  item: CommercialProposalItem,
): CommercialProposalItemFormValues {
  return {
    id: item.id,
    lineDiscountAmount: toDecimalInput(item.lineDiscountAmount),
    lineDiscountPercent: toDecimalInput(item.lineDiscountPercent),
    lineSubtotalAmount: toDecimalInput(item.lineSubtotalAmount),
    lineTotalAmount: toDecimalInput(item.lineTotalAmount),
    quantity: toDecimalInput(item.quantity),
    serviceCodeSnapshot: item.serviceCodeSnapshot,
    serviceDescriptionSnapshot: item.serviceDescriptionSnapshot,
    serviceId: item.serviceId,
    serviceNameSnapshot: item.serviceNameSnapshot,
    sortOrder: item.sortOrder,
    unitPriceAmount: toDecimalInput(item.unitPriceAmount),
  };
}

export function mapProposalItemFormValuesOrDefault(items: CommercialProposalItem[]) {
  return items.length > 0
    ? items.map(mapProposalItemFormValues)
    : [emptyItemFormValues()];
}

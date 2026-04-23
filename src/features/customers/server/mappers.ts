import "server-only";

import type { Customer } from "@prisma/client";

import { customerContractPlaceholder } from "@/features/customers/constants/customer-constants";
import type {
  CustomerFormPageData,
  CustomerListRow,
} from "@/features/customers/types/customer-types";
import { formatCustomerCode } from "@/lib/customer/formatters";
import {
  formatBrazilPhone,
  formatCpfCnpj,
  formatPostalCode,
} from "@/lib/formatters/brazil";

type CustomerWithAuditUsers = Customer & {
  createdBy?: { fullName: string } | null;
  updatedBy?: { fullName: string } | null;
};

export function mapCustomerListRow(
  customer: Customer,
  companyName: string,
): CustomerListRow {
  return {
    code: formatCustomerCode(customer.code, companyName),
    contractNumber: customerContractPlaceholder.contractNumber,
    federalDocument: formatCpfCnpj(customer.federalDocument),
    id: customer.id,
    name: customer.name,
    stateCode: customer.stateCode || "-",
    status: customer.status,
    type: customer.type,
  };
}

export function mapCustomerFormData(
  customer: CustomerWithAuditUsers | null,
  code: number,
  companyName: string,
): CustomerFormPageData["customer"] {
  return {
    addressComplement: customer?.addressComplement ?? "",
    city: customer?.city ?? "",
    cityDocument: customer?.cityDocument ?? "",
    code: formatCustomerCode(customer?.code ?? code, companyName),
    contractDueDate: customerContractPlaceholder.contractDueDate,
    contractNumber: customerContractPlaceholder.contractNumber,
    contractPlan: customerContractPlaceholder.contractPlan,
    contractStartDate: customerContractPlaceholder.contractStartDate,
    email: customer?.email ?? "",
    federalDocument: customer ? formatCpfCnpj(customer.federalDocument) : "",
    id: customer?.id ?? null,
    name: customer?.name ?? "",
    neighborhood: customer?.neighborhood ?? "",
    phone: formatBrazilPhone(customer?.phone ?? ""),
    postalCode: formatPostalCode(customer?.postalCode ?? ""),
    stateCode: customer?.stateCode ?? "",
    stateDocument: customer?.stateDocument ?? "",
    status: customer?.status ?? "ACTIVE",
    street: customer?.street ?? "",
    streetNumber: customer?.streetNumber ?? "",
    type: customer?.type ?? "COMPANY",
    whatsapp: formatBrazilPhone(customer?.whatsapp ?? ""),
    whatsappReminderEnabled: customer?.whatsappReminderEnabled ?? false,
  };
}

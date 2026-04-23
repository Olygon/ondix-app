import "server-only";

import type {
  CustomerStatus,
  CustomerType,
  Prisma,
} from "@prisma/client";

import {
  customerSortFields,
  customerStatusOptions,
  customerTypeOptions,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/features/customers/constants/customer-constants";
import type { CustomerListFilters } from "@/features/customers/types/customer-types";
import { onlyDigits } from "@/lib/formatters/brazil";
import { parsePageParam } from "@/lib/helpers/pagination";
import {
  getSearchParamValue,
  parseSortDirection,
} from "@/lib/helpers/search-params";
import type { SearchParams } from "@/types/search-params";

export type CustomerWriteInput = {
  addressComplement?: string;
  city?: string;
  cityDocument?: string;
  customerId?: string | null;
  email?: string;
  federalDocument: string;
  name: string;
  neighborhood?: string;
  phone?: string;
  postalCode?: string;
  stateCode?: string;
  stateDocument?: string;
  status: CustomerStatus;
  street?: string;
  streetNumber?: string;
  type: CustomerType;
  whatsapp?: string;
  whatsappReminderEnabled: boolean;
};

const customerStatusValues = new Set(customerStatusOptions.map((item) => item.value));
const customerTypeValues = new Set(customerTypeOptions.map((item) => item.value));
const customerSortValues = new Set<string>(customerSortFields);

function parseSort(value: string): CustomerSortField {
  return customerSortValues.has(value) ? (value as CustomerSortField) : "code";
}

function parseStatus(value: string): CustomerStatus | "" {
  return customerStatusValues.has(value as CustomerStatus)
    ? (value as CustomerStatus)
    : "";
}

function parseType(value: string): CustomerType | "" {
  return customerTypeValues.has(value as CustomerType) ? (value as CustomerType) : "";
}

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function normalizeEmail(value?: string | null) {
  return normalizeNullable(value)?.toLowerCase() ?? null;
}

function normalizeStateCode(value?: string | null) {
  return normalizeNullable(value)?.toUpperCase() ?? null;
}

export function parseCustomerFilters(
  searchParams?: SearchParams,
): CustomerListFilters {
  return {
    contractDuePeriod: getSearchParamValue(searchParams, "contractDuePeriod").trim(),
    direction: parseSortDirection(getSearchParamValue(searchParams, "direction")),
    federalDocument: getSearchParamValue(searchParams, "federalDocument").trim(),
    name: getSearchParamValue(searchParams, "name").trim(),
    page: parsePageParam(getSearchParamValue(searchParams, "page")),
    plan: getSearchParamValue(searchParams, "plan").trim(),
    sort: parseSort(getSearchParamValue(searchParams, "sort")),
    status: parseStatus(getSearchParamValue(searchParams, "status")),
    type: parseType(getSearchParamValue(searchParams, "type")),
  };
}

export function buildCustomerWhere(
  companyId: string,
  filters: CustomerListFilters,
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    companyId,
    deletedAt: null,
  };
  const documentDigits = onlyDigits(filters.federalDocument);

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.name) {
    where.name = {
      contains: filters.name,
      mode: "insensitive",
    };
  }

  if (documentDigits) {
    where.federalDocument = {
      contains: documentDigits,
    };
  }

  return where;
}

export function buildCustomerOrderBy(
  sort: CustomerSortField,
  direction: CustomerSortDirection,
): Prisma.CustomerOrderByWithRelationInput[] {
  if (sort === "type") {
    return [{ type: direction }, { name: "asc" }];
  }

  if (sort === "name") {
    return [{ name: direction }, { code: "asc" }];
  }

  if (sort === "federalDocument") {
    return [{ federalDocument: direction }, { code: "asc" }];
  }

  if (sort === "stateCode") {
    return [{ stateCode: direction }, { code: "asc" }];
  }

  if (sort === "status") {
    return [{ status: direction }, { code: "asc" }];
  }

  return [{ code: direction }];
}

export function buildCustomerWriteData(input: CustomerWriteInput) {
  return {
    addressComplement: normalizeNullable(input.addressComplement),
    city: normalizeNullable(input.city),
    cityDocument: normalizeNullable(input.cityDocument),
    email: normalizeEmail(input.email),
    federalDocument: onlyDigits(input.federalDocument),
    name: input.name.trim(),
    neighborhood: normalizeNullable(input.neighborhood),
    phone: onlyDigits(input.phone ?? "") || null,
    postalCode: onlyDigits(input.postalCode ?? "") || null,
    stateCode: normalizeStateCode(input.stateCode),
    stateDocument: normalizeNullable(input.stateDocument),
    status: input.status,
    street: normalizeNullable(input.street),
    streetNumber: normalizeNullable(input.streetNumber),
    type: input.type,
    whatsapp: onlyDigits(input.whatsapp ?? "") || null,
    whatsappReminderEnabled: input.whatsappReminderEnabled,
  };
}

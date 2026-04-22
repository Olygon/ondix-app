import "server-only";

import { redirect } from "next/navigation";
import type {
  Customer,
  CustomerStatus,
  CustomerType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import {
  customerContractPlaceholder,
  customerPageSize,
  customerSortFields,
  customerStatusOptions,
  customerTypeOptions,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/lib/customer/constants";
import {
  formatCpfCnpj,
  formatCustomerCode,
} from "@/lib/customer/formatters";
import type {
  CustomerFormPageData,
  CustomerListFilters,
  CustomerListPageData,
  CustomerListRow,
} from "@/lib/customer/types";
import {
  formatBrazilPhone,
  formatDateBr,
  formatPostalCode,
  onlyDigits,
} from "@/lib/company/formatters";
import { prisma } from "@/lib/db";

export type CustomerSearchParams = Record<string, string | string[] | undefined>;

type CustomerWriteInput = {
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

type CustomerDelegateClient = Pick<PrismaClient, "customer">;

const customerStatusValues = new Set(customerStatusOptions.map((item) => item.value));
const customerTypeValues = new Set(customerTypeOptions.map((item) => item.value));
const customerSortValues = new Set<string>(customerSortFields);

function getSearchValue(params: CustomerSearchParams | undefined, key: string) {
  const value = params?.[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string) {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseSort(value: string): CustomerSortField {
  return customerSortValues.has(value) ? (value as CustomerSortField) : "code";
}

function parseDirection(value: string): CustomerSortDirection {
  return value === "desc" ? "desc" : "asc";
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

function parseCustomerFilters(
  searchParams?: CustomerSearchParams,
): CustomerListFilters {
  return {
    contractDuePeriod: getSearchValue(searchParams, "contractDuePeriod").trim(),
    direction: parseDirection(getSearchValue(searchParams, "direction")),
    federalDocument: getSearchValue(searchParams, "federalDocument").trim(),
    name: getSearchValue(searchParams, "name").trim(),
    page: parsePage(getSearchValue(searchParams, "page")),
    plan: getSearchValue(searchParams, "plan").trim(),
    sort: parseSort(getSearchValue(searchParams, "sort")),
    status: parseStatus(getSearchValue(searchParams, "status")),
    type: parseType(getSearchValue(searchParams, "type")),
  };
}

function buildCustomerWhere(
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

function buildCustomerOrderBy(
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

function mapCustomerListRow(customer: Customer, companyName: string): CustomerListRow {
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

async function getNextCustomerCode(
  companyId: string,
  client: CustomerDelegateClient = prisma,
) {
  const lastCustomer = await client.customer.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
    where: { companyId },
  });

  return (lastCustomer?.code ?? 0) + 1;
}

function mapCustomerFormData(
  customer: (Customer & {
    createdBy?: { fullName: string } | null;
    updatedBy?: { fullName: string } | null;
  }) | null,
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

async function findCustomerForCompany(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    include: {
      createdBy: {
        select: { fullName: true },
      },
      updatedBy: {
        select: { fullName: true },
      },
    },
    where: {
      companyId,
      deletedAt: null,
      id: customerId,
    },
  });
}

async function findDuplicateDocument(
  companyId: string,
  federalDocument: string,
  customerId?: string | null,
) {
  return prisma.customer.findFirst({
    select: { id: true },
    where: {
      companyId,
      federalDocument,
      id: customerId
        ? {
            not: customerId,
          }
        : undefined,
    },
  });
}

function buildCustomerWriteData(input: CustomerWriteInput) {
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

async function ensureCustomerCanBeDeleted(_customerId: string) {
  void _customerId;

  // Ponto preparado para bloquear exclusao quando existirem titulos financeiros ativos.
  return { ok: true as const };
}

export async function getCustomerListPageData(
  searchParams?: CustomerSearchParams,
): Promise<CustomerListPageData> {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "view");
  const filters = parseCustomerFilters(searchParams);
  const where = buildCustomerWhere(context.company.id, filters);
  const [totalItems, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      orderBy: buildCustomerOrderBy(filters.sort, filters.direction),
      skip: (filters.page - 1) * customerPageSize,
      take: customerPageSize,
      where,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / customerPageSize));

  return {
    access: {
      customers: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmCustomer,
      ),
    },
    companyName: context.company.name,
    customers: customers.map((customer) =>
      mapCustomerListRow(customer, context.company.name),
    ),
    filters: {
      ...filters,
      page: Math.min(filters.page, totalPages),
    },
    pagination: {
      page: Math.min(filters.page, totalPages),
      pageSize: customerPageSize,
      totalItems,
      totalPages,
    },
  };
}

export async function getCustomerFormPageData(
  customerId?: string,
): Promise<CustomerFormPageData> {
  const context = await requirePermission(
    RESOURCE_CODES.crmCustomer,
    customerId ? "view" : "add",
  );
  const customer = customerId
    ? await findCustomerForCompany(context.company.id, customerId)
    : null;

  if (customerId && !customer) {
    redirect("/crm/cliente");
  }

  const nextCode = customer?.code ?? (await getNextCustomerCode(context.company.id));

  return {
    access: {
      customers: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmCustomer,
      ),
    },
    companyName: context.company.name,
    createdAt: customer ? formatDateBr(customer.createdAt) : "",
    createdByName: customer?.createdBy?.fullName ?? "",
    customer: mapCustomerFormData(customer, nextCode, context.company.name),
    isEditMode: Boolean(customer),
    updatedAt: customer ? formatDateBr(customer.updatedAt) : "",
    updatedByName: customer?.updatedBy?.fullName ?? "",
  };
}

export async function saveCustomer(input: CustomerWriteInput) {
  const isEdit = Boolean(input.customerId);
  const context = await requirePermission(
    RESOURCE_CODES.crmCustomer,
    isEdit ? "edit" : "add",
  );
  const normalizedFederalDocument = onlyDigits(input.federalDocument);
  const [currentCustomer, duplicateDocument] = await Promise.all([
    input.customerId
      ? findCustomerForCompany(context.company.id, input.customerId)
      : Promise.resolve(null),
    findDuplicateDocument(
      context.company.id,
      normalizedFederalDocument,
      input.customerId,
    ),
  ]);

  if (isEdit && !currentCustomer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  if (duplicateDocument) {
    return {
      ok: false as const,
      fieldErrors: {
        federalDocument: [
          "Ja existe um cliente com este CPF/CNPJ na empresa ativa.",
        ],
      },
      message: "Ja existe um cliente com este CPF/CNPJ na empresa ativa.",
    };
  }

  const data = buildCustomerWriteData({
    ...input,
    federalDocument: normalizedFederalDocument,
  });

  try {
    const savedCustomer = isEdit
      ? await prisma.customer.update({
          data: {
            ...data,
            updatedById: context.user.id,
          },
          where: { id: currentCustomer!.id },
        })
      : await prisma.$transaction(async (tx) => {
          const nextCode = await getNextCustomerCode(context.company.id, tx);

          return tx.customer.create({
            data: {
              ...data,
              code: nextCode,
              companyId: context.company.id,
              createdById: context.user.id,
              updatedById: context.user.id,
            },
          });
        });

    return {
      ok: true as const,
      message: isEdit
        ? "Cliente atualizado com sucesso."
        : "Cliente cadastrado com sucesso.",
      savedCustomerId: savedCustomer.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        fieldErrors: {
          federalDocument: [
            "Ja existe um cliente com este CPF/CNPJ ou codigo nesta empresa.",
          ],
        },
        message:
          "Nao foi possivel salvar porque ja existe um cliente com dados unicos iguais nesta empresa.",
      };
    }

    throw error;
  }
}

export async function deleteCustomer(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "delete");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const deletionGuard = await ensureCustomerCanBeDeleted(customer.id);

  if (!deletionGuard.ok) {
    return {
      ok: false as const,
      message:
        "Nao foi possivel excluir este cliente porque existem vinculos financeiros ativos.",
    };
  }

  await prisma.customer.update({
    data: {
      deletedAt: new Date(),
      status: "INACTIVE",
      updatedById: context.user.id,
    },
    where: { id: customer.id },
  });

  return {
    ok: true as const,
    message: "Cliente excluido com sucesso. O registro foi preservado no historico.",
  };
}

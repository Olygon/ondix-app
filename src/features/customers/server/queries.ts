import "server-only";

import { redirect } from "next/navigation";
import type { PrismaClient } from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import {
  customerPageSize,
} from "@/features/customers/constants/customer-constants";
import {
  buildCustomerOrderBy,
  buildCustomerWhere,
  parseCustomerFilters,
} from "@/features/customers/server/helpers";
import {
  mapCustomerFormData,
  mapCustomerListRow,
} from "@/features/customers/server/mappers";
import type {
  CustomerFormPageData,
  CustomerListPageData,
} from "@/features/customers/types/customer-types";
import { formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import type { SearchParams } from "@/types/search-params";

type CustomerDelegateClient = Pick<PrismaClient, "customer">;

export type CustomerSearchParams = SearchParams;

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

export async function getNextCustomerCode(
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

export async function findCustomerForCompany(companyId: string, customerId: string) {
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

export async function findDuplicateDocument(
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

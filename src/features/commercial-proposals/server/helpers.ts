import "server-only";

import type {
  AccessLevel,
  CommercialProposalStatus,
  Prisma,
} from "@prisma/client";

import { isManagerialLevel } from "@/lib/access-management/constants";
import {
  commercialProposalSortFields,
  commercialProposalStatusOptions,
  type CommercialProposalSortDirection,
  type CommercialProposalSortField,
} from "@/features/commercial-proposals/constants/commercial-proposal-constants";
import type { CommercialProposalListFilters } from "@/features/commercial-proposals/types/commercial-proposal-types";

export type CommercialProposalSearchParams = Record<
  string,
  string | string[] | undefined
>;

type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

type CommercialProposalPermissionContext = {
  accessProfile: {
    isAdministrator: boolean;
    level: AccessLevel;
  };
};

const proposalStatusValues = new Set(
  commercialProposalStatusOptions.map((item) => item.value),
);
const proposalSortValues = new Set<string>(commercialProposalSortFields);

function getSearchValue(params: CommercialProposalSearchParams | undefined, key: string) {
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

function parseDirection(value: string): CommercialProposalSortDirection {
  return value === "desc" ? "desc" : "asc";
}

function parseStatus(value: string): CommercialProposalStatus | "" {
  return proposalStatusValues.has(value as CommercialProposalStatus)
    ? (value as CommercialProposalStatus)
    : "";
}

function parseSort(value: string): CommercialProposalSortField {
  return proposalSortValues.has(value)
    ? (value as CommercialProposalSortField)
    : "createdAt";
}

export function normalizeDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  date.setHours(0, 0, 0, 0);

  return date;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export function toDateInput(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toNumber(value?: DecimalLike | number | string | null) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber?.() ?? Number(value.toString());
}

export function toCurrency(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(toNumber(value));
}

export function toDecimalInput(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(toNumber(value));
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyString(value: number) {
  return roundMoney(value).toFixed(2);
}

export function formatProposalCode(code: number) {
  return `PC-${String(code).padStart(5, "0")}`;
}

export function formatServiceCode(code: number) {
  return `SRV-${String(code).padStart(4, "0")}`;
}

export function parseProposalFilters(
  searchParams?: CommercialProposalSearchParams,
): CommercialProposalListFilters {
  return {
    createdFrom: getSearchValue(searchParams, "createdFrom").trim(),
    createdTo: getSearchValue(searchParams, "createdTo").trim(),
    customerId: getSearchValue(searchParams, "customerId").trim(),
    direction: parseDirection(getSearchValue(searchParams, "direction")),
    page: parsePage(getSearchValue(searchParams, "page")),
    search: getSearchValue(searchParams, "search").trim(),
    sort: parseSort(getSearchValue(searchParams, "sort")),
    status: parseStatus(getSearchValue(searchParams, "status")),
  };
}

export function buildProposalWhere(
  companyId: string,
  filters: CommercialProposalListFilters,
): Prisma.CommercialProposalWhereInput {
  const where: Prisma.CommercialProposalWhereInput = {
    companyId,
    deletedAt: null,
  };

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      gte: filters.createdFrom
        ? normalizeDateInput(filters.createdFrom)
        : undefined,
      lt: filters.createdTo
        ? addDays(normalizeDateInput(filters.createdTo), 1)
        : undefined,
    };
  }

  if (filters.search) {
    const numericSearch = Number(filters.search.replace(/\D/g, ""));

    where.OR = [
      {
        customer: {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      },
    ];

    if (Number.isInteger(numericSearch) && numericSearch > 0) {
      where.OR.push({ code: numericSearch });
    }
  }

  return where;
}

export function buildProposalOrderBy(
  sort: CommercialProposalSortField,
  direction: CommercialProposalSortDirection,
): Prisma.CommercialProposalOrderByWithRelationInput[] {
  if (sort === "code") {
    return [{ code: direction }];
  }

  if (sort === "customer") {
    return [{ customer: { name: direction } }, { code: "desc" }];
  }

  if (sort === "validUntil") {
    return [{ validUntil: direction }, { code: "desc" }];
  }

  if (sort === "totalAmount") {
    return [{ totalAmount: direction }, { code: "desc" }];
  }

  if (sort === "status") {
    return [{ status: direction }, { code: "desc" }];
  }

  return [{ createdAt: direction }, { code: "desc" }];
}

export function isCurrentUserApprovalAllowed(
  context: CommercialProposalPermissionContext,
) {
  return (
    context.accessProfile.isAdministrator ||
    isManagerialLevel(context.accessProfile.level)
  );
}

import "server-only";

import type {
  EntityStatus,
  MunicipalTaxCode,
  Prisma,
  ProvidedServiceStatus,
  ServiceLaw116Code,
  ServiceNbsCode,
} from "@prisma/client";

import {
  auxiliaryCodeSortFields,
  providedServiceSortFields,
  providedServiceStatusOptions,
  serviceAuxiliaryKinds,
  type AuxiliaryCodeSortField,
  type ProvidedServiceSortField,
  type ServiceAuxiliaryKind,
  type ServiceSortDirection,
} from "@/features/services/constants/service-constants";
import type {
  AuxiliaryCodeListFilters,
  ProvidedServiceListFilters,
} from "@/features/services/types/service-types";
import type { DecimalLike } from "@/lib/helpers/number";
import { toNumber } from "@/lib/helpers/number";
import { toCurrency } from "@/lib/helpers/money";

export type ServiceSearchParams = Record<string, string | string[] | undefined>;

const serviceStatusValues = new Set(providedServiceStatusOptions.map((item) => item.value));
const serviceSortValues = new Set<string>(providedServiceSortFields);
const auxiliarySortValues = new Set<string>(auxiliaryCodeSortFields);
const auxiliaryKindValues = new Set<string>(serviceAuxiliaryKinds);

function getSearchValue(params: ServiceSearchParams | undefined, key: string) {
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

function parseDirection(value: string): ServiceSortDirection {
  return value === "desc" ? "desc" : "asc";
}

function parseServiceStatus(value: string): ProvidedServiceStatus | "" {
  return serviceStatusValues.has(value as ProvidedServiceStatus)
    ? (value as ProvidedServiceStatus)
    : "";
}

function parseEntityStatus(value: string): EntityStatus | "" {
  return value === "ACTIVE" || value === "INACTIVE" ? value : "";
}

function parseProvidedServiceSort(value: string): ProvidedServiceSortField {
  return serviceSortValues.has(value) ? (value as ProvidedServiceSortField) : "code";
}

function parseAuxiliaryCodeSort(value: string): AuxiliaryCodeSortField {
  return auxiliarySortValues.has(value) ? (value as AuxiliaryCodeSortField) : "code";
}

export function parseServiceAuxiliaryKind(value: string): ServiceAuxiliaryKind {
  return auxiliaryKindValues.has(value) ? (value as ServiceAuxiliaryKind) : "law116";
}

export { toCurrency, toNumber };

export function toDecimalInput(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(toNumber(value));
}

export function toDecimalInputFixed(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(toNumber(value));
}

export function toPercent(value?: DecimalLike | number | string | null) {
  return `${toDecimalInput(value)}%`;
}

export function formatServiceCode(code: number) {
  return `SRV-${String(code).padStart(4, "0")}`;
}

export function formatCodeOption(code: string, description: string) {
  return `${code} - ${description}`;
}

function getCodePrimaryNumber(code: string) {
  const match = code.trim().match(/^\d+/);

  return match ? Number(match[0]) : 0;
}

function compareText(valueA: string | null | undefined, valueB: string | null | undefined) {
  return (valueA ?? "").localeCompare(valueB ?? "", "pt-BR", {
    sensitivity: "base",
  });
}

export function compareClassificationCode(codeA: string, codeB: string) {
  const primaryComparison = getCodePrimaryNumber(codeA) - getCodePrimaryNumber(codeB);

  if (primaryComparison !== 0) {
    return primaryComparison;
  }

  return codeA.localeCompare(codeB, "pt-BR", {
    sensitivity: "base",
  });
}

export function applySortDirection(
  comparison: number,
  direction: ServiceSortDirection,
) {
  return direction === "desc" ? comparison * -1 : comparison;
}

export function parseProvidedServiceFilters(
  searchParams?: ServiceSearchParams,
): ProvidedServiceListFilters {
  return {
    direction: parseDirection(getSearchValue(searchParams, "direction")),
    page: parsePage(getSearchValue(searchParams, "page")),
    search: getSearchValue(searchParams, "search").trim(),
    sort: parseProvidedServiceSort(getSearchValue(searchParams, "sort")),
    status: parseServiceStatus(getSearchValue(searchParams, "status")),
  };
}

export function parseAuxiliaryCodeFilters(
  searchParams?: ServiceSearchParams,
): AuxiliaryCodeListFilters {
  return {
    direction: parseDirection(getSearchValue(searchParams, "direction")),
    page: parsePage(getSearchValue(searchParams, "page")),
    search: getSearchValue(searchParams, "search").trim(),
    sort: parseAuxiliaryCodeSort(getSearchValue(searchParams, "sort")),
    status: parseEntityStatus(getSearchValue(searchParams, "status")),
  };
}

export function buildProvidedServiceWhere(
  companyId: string,
  filters: ProvidedServiceListFilters,
): Prisma.ProvidedServiceWhereInput {
  return {
    companyId,
    deletedAt: null,
    status: filters.status || undefined,
    OR: filters.search
      ? [
          {
            name: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        ]
      : undefined,
  };
}

export function buildProvidedServiceOrderBy(
  sort: ProvidedServiceSortField,
  direction: ServiceSortDirection,
): Prisma.ProvidedServiceOrderByWithRelationInput[] {
  if (sort === "name") {
    return [{ name: direction }, { code: "asc" }];
  }

  if (sort === "law116") {
    return [{ serviceLaw116: { cTribNac: direction } }, { code: "asc" }];
  }

  if (sort === "nbs") {
    return [{ serviceNbs: { code: direction } }, { code: "asc" }];
  }

  if (sort === "costAmount") {
    return [{ costAmount: direction }, { code: "asc" }];
  }

  if (sort === "priceAmount") {
    return [{ priceAmount: direction }, { code: "asc" }];
  }

  if (sort === "profitMarginPercent") {
    return [{ profitMarginPercent: direction }, { code: "asc" }];
  }

  if (sort === "status") {
    return [{ status: direction }, { code: "asc" }];
  }

  return [{ code: direction }];
}

export function buildAuxiliaryWhere(
  kind: ServiceAuxiliaryKind,
  filters: AuxiliaryCodeListFilters,
):
  | Prisma.ServiceLaw116CodeWhereInput
  | Prisma.ServiceNbsCodeWhereInput
  | Prisma.MunicipalTaxCodeWhereInput {
  const status = filters.status || undefined;

  if (kind === "municipalTax") {
    return {
      status,
      OR: filters.search
        ? [
            { cTribMun: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { municipalityIbgeCode: { contains: filters.search } },
            { municipalityName: { contains: filters.search, mode: "insensitive" } },
            { stateCode: { contains: filters.search, mode: "insensitive" } },
          ]
        : undefined,
    };
  }

  if (kind === "nbs") {
    return {
      status,
      OR: filters.search
        ? [
            { code: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { category: { contains: filters.search, mode: "insensitive" } },
          ]
        : undefined,
    };
  }

  return {
    status,
    OR: filters.search
      ? [
          { cTribNac: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { category: { contains: filters.search, mode: "insensitive" } },
        ]
      : undefined,
  };
}

export function sortMunicipalTaxCodes(
  codes: MunicipalTaxCode[],
  sort: AuxiliaryCodeSortField,
  direction: ServiceSortDirection,
) {
  return [...codes].sort((codeA, codeB) => {
    if (sort === "description") {
      return (
        applySortDirection(compareText(codeA.description, codeB.description), direction) ||
        compareText(codeA.municipalityName, codeB.municipalityName) ||
        compareClassificationCode(codeA.cTribMun, codeB.cTribMun)
      );
    }

    if (sort === "status") {
      return (
        applySortDirection(compareText(codeA.status, codeB.status), direction) ||
        compareText(codeA.municipalityName, codeB.municipalityName) ||
        compareClassificationCode(codeA.cTribMun, codeB.cTribMun)
      );
    }

    return (
      applySortDirection(compareClassificationCode(codeA.cTribMun, codeB.cTribMun), direction) ||
      compareText(codeA.municipalityName, codeB.municipalityName) ||
      compareText(codeA.stateCode, codeB.stateCode) ||
      compareText(codeA.municipalityIbgeCode, codeB.municipalityIbgeCode)
    );
  });
}

export function sortNbsCodes(
  codes: ServiceNbsCode[],
  sort: AuxiliaryCodeSortField,
  direction: ServiceSortDirection,
) {
  return [...codes].sort((codeA, codeB) => {
    if (sort === "description") {
      return (
        applySortDirection(compareText(codeA.description, codeB.description), direction) ||
        compareClassificationCode(codeA.code, codeB.code)
      );
    }

    if (sort === "category") {
      return (
        applySortDirection(compareText(codeA.category, codeB.category), direction) ||
        compareClassificationCode(codeA.code, codeB.code)
      );
    }

    if (sort === "status") {
      return (
        applySortDirection(compareText(codeA.status, codeB.status), direction) ||
        compareClassificationCode(codeA.code, codeB.code)
      );
    }

    return applySortDirection(compareClassificationCode(codeA.code, codeB.code), direction);
  });
}

export function sortLaw116Codes(
  codes: ServiceLaw116Code[],
  sort: AuxiliaryCodeSortField,
  direction: ServiceSortDirection,
) {
  return [...codes].sort((codeA, codeB) => {
    if (sort === "description") {
      return (
        applySortDirection(compareText(codeA.description, codeB.description), direction) ||
        compareClassificationCode(codeA.cTribNac, codeB.cTribNac)
      );
    }

    if (sort === "category") {
      return (
        applySortDirection(compareText(codeA.category, codeB.category), direction) ||
        compareClassificationCode(codeA.cTribNac, codeB.cTribNac)
      );
    }

    if (sort === "status") {
      return (
        applySortDirection(compareText(codeA.status, codeB.status), direction) ||
        compareClassificationCode(codeA.cTribNac, codeB.cTribNac)
      );
    }

    return applySortDirection(
      compareClassificationCode(codeA.cTribNac, codeB.cTribNac),
      direction,
    );
  });
}

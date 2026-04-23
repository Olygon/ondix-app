import "server-only";

import { redirect } from "next/navigation";
import type {
  EntityStatus,
  Municipality,
  MunicipalTaxCode,
  Prisma,
  PrismaClient,
  ProvidedService,
  ProvidedServiceStatus,
  ServiceLaw116Code,
  ServiceMunicipalTaxRule,
  ServiceNbsCode,
} from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import {
  auxiliaryCodePageSize,
  auxiliaryCodeSortFields,
  providedServicePageSize,
  providedServiceSortFields,
  providedServiceStatusOptions,
  serviceAuxiliaryKinds,
  type AuxiliaryCodeSortField,
  type ServiceAuxiliaryKind,
  type ServiceSortDirection,
  type ProvidedServiceSortField,
} from "@/lib/services/constants";
import type {
  AuxiliaryCodeFormPageData,
  AuxiliaryCodeFormValues,
  AuxiliaryCodeListFilters,
  AuxiliaryCodeListPageData,
  AuxiliaryCodeListRow,
  MunicipalityOption,
  MunicipalTaxCodeOption,
  ProvidedServiceFormPageData,
  ProvidedServiceFormValues,
  ProvidedServiceListFilters,
  ProvidedServiceListPageData,
  ProvidedServiceListRow,
  ServiceMunicipalTaxRuleRow,
  ServiceOption,
} from "@/lib/services/types";

export type ServiceSearchParams = Record<string, string | string[] | undefined>;

type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

type ProvidedServiceWriteInput = Omit<
  ProvidedServiceFormValues,
  "code" | "id"
> & {
  serviceId?: string | null;
};

type ServiceMunicipalTaxRuleWriteInput = {
  isDefault: boolean;
  issRate: string;
  municipalTaxCodeId: string;
  municipalityIbgeCode: string;
  notes?: string;
  ruleId?: string | null;
  serviceId: string;
};

type AuxiliaryCodeWriteInput = Omit<AuxiliaryCodeFormValues, "id"> & {
  auxiliaryCodeId?: string | null;
};

type ProvidedServiceDelegateClient = Pick<PrismaClient, "providedService">;

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

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function normalizeDecimalInput(value?: string | null) {
  const normalized = value?.trim().replace(/\./g, "").replace(",", ".") ?? "";

  return normalized || "0";
}

function toNumber(value?: DecimalLike | number | string | null) {
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

function toCurrency(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(toNumber(value));
}

function toDecimalInput(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(toNumber(value));
}

function toDecimalInputFixed(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(toNumber(value));
}

function toPercent(value?: DecimalLike | number | string | null) {
  return `${toDecimalInput(value)}%`;
}

function formatServiceCode(code: number) {
  return `SRV-${String(code).padStart(4, "0")}`;
}

function formatCodeOption(code: string, description: string) {
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

function compareClassificationCode(codeA: string, codeB: string) {
  const primaryComparison = getCodePrimaryNumber(codeA) - getCodePrimaryNumber(codeB);

  if (primaryComparison !== 0) {
    return primaryComparison;
  }

  return codeA.localeCompare(codeB, "pt-BR", {
    sensitivity: "base",
  });
}

function applySortDirection(comparison: number, direction: ServiceSortDirection) {
  return direction === "desc" ? comparison * -1 : comparison;
}

function parseProvidedServiceFilters(
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

function parseAuxiliaryCodeFilters(
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

function buildProvidedServiceWhere(
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

function buildProvidedServiceOrderBy(
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

function mapProvidedServiceListRow(
  service: ProvidedService & {
    serviceLaw116: ServiceLaw116Code;
    serviceNbs: ServiceNbsCode;
  },
): ProvidedServiceListRow {
  return {
    code: formatServiceCode(service.code),
    costAmount: toCurrency(service.costAmount),
    description: service.description,
    id: service.id,
    law116: service.serviceLaw116.cTribNac,
    name: service.name,
    nbs: service.serviceNbs.code,
    priceAmount: toCurrency(service.priceAmount),
    profitMarginPercent: toPercent(service.profitMarginPercent),
    status: service.status,
  };
}

function sortProvidedServicesByClassificationCode(
  services: Array<
    ProvidedService & {
      serviceLaw116: ServiceLaw116Code;
      serviceNbs: ServiceNbsCode;
    }
  >,
  sort: ProvidedServiceSortField,
  direction: ServiceSortDirection,
) {
  return [...services].sort((serviceA, serviceB) => {
    const codeA = sort === "law116" ? serviceA.serviceLaw116.cTribNac : serviceA.serviceNbs.code;
    const codeB = sort === "law116" ? serviceB.serviceLaw116.cTribNac : serviceB.serviceNbs.code;
    const classificationComparison = applySortDirection(
      compareClassificationCode(codeA, codeB),
      direction,
    );

    return classificationComparison || serviceA.code - serviceB.code;
  });
}

function mapServiceOption(code: ServiceLaw116Code | ServiceNbsCode): ServiceOption {
  const codeValue = "cTribNac" in code ? code.cTribNac : code.code;

  return {
    id: code.id,
    label: formatCodeOption(codeValue, code.description),
    status: code.status,
  };
}

function mapMunicipalTaxCodeOption(code: MunicipalTaxCode): MunicipalTaxCodeOption {
  return {
    defaultIssRate: toDecimalInput(code.defaultIssRate),
    id: code.id,
    label: `${code.municipalityName || "Municipio"} / ${code.stateCode || "UF"} / ${code.municipalityIbgeCode} / ${code.cTribMun} - ${code.description}`,
    municipalityIbgeCode: code.municipalityIbgeCode,
    municipalityName: code.municipalityName,
    stateCode: code.stateCode,
    status: code.status,
  };
}

function mapMunicipalityOption(municipality: Municipality): MunicipalityOption {
  return {
    ibgeCode: municipality.ibgeCode,
    label: `${municipality.ibgeCode} - ${municipality.name}/${municipality.stateCode}`,
    name: municipality.name,
    stateCode: municipality.stateCode,
  };
}

function mapTaxRuleRow(
  rule: ServiceMunicipalTaxRule & {
    municipalTaxCode: MunicipalTaxCode;
  },
): ServiceMunicipalTaxRuleRow {
  return {
    cTribMun: rule.municipalTaxCode.cTribMun,
    description: rule.municipalTaxCode.description,
    id: rule.id,
    isDefault: rule.isDefault,
    issRate: toDecimalInput(rule.issRate),
    municipalTaxCodeId: rule.municipalTaxCodeId,
    municipalityIbgeCode: rule.municipalityIbgeCode,
    municipalityName: rule.municipalTaxCode.municipalityName,
    notes: rule.notes ?? "",
  };
}

async function getNextProvidedServiceCode(
  companyId: string,
  client: ProvidedServiceDelegateClient = prisma,
) {
  const lastService = await client.providedService.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
    where: { companyId },
  });

  return (lastService?.code ?? 0) + 1;
}

function mapProvidedServiceFormValues(
  service: ProvidedService | null,
  code: number,
): ProvidedServiceFormValues {
  return {
    administrativeCostPercent: toDecimalInput(service?.administrativeCostPercent),
    code: formatServiceCode(service?.code ?? code),
    commissionPercent: toDecimalInput(service?.commissionPercent),
    costAmount: toDecimalInput(service?.costAmount),
    description: service?.description ?? "",
    id: service?.id ?? null,
    name: service?.name ?? "",
    priceAmount: toDecimalInput(service?.priceAmount),
    profitMarginPercent: toDecimalInput(service?.profitMarginPercent),
    serviceLaw116Id: service?.serviceLaw116Id ?? "",
    serviceNbsId: service?.serviceNbsId ?? "",
    status: service?.status ?? "ACTIVE",
    taxCbsPercent: toDecimalInput(service?.taxCbsPercent),
    taxCidPercent: toDecimalInput(service?.taxCidPercent),
    taxCofinsPercent: toDecimalInput(service?.taxCofinsPercent),
    taxCsllPercent: toDecimalInput(service?.taxCsllPercent),
    taxIbsPercent: toDecimalInput(service?.taxIbsPercent),
    taxIcmsPercent: toDecimalInput(service?.taxIcmsPercent),
    taxIpiPercent: toDecimalInput(service?.taxIpiPercent),
    taxIrpjPercent: toDecimalInput(service?.taxIrpjPercent),
    taxPisPercent: toDecimalInput(service?.taxPisPercent),
    taxSimpleNationalPercent: toDecimalInput(service?.taxSimpleNationalPercent),
  };
}

function buildProvidedServiceWriteData(input: ProvidedServiceWriteInput) {
  return {
    administrativeCostPercent: normalizeDecimalInput(input.administrativeCostPercent),
    commissionPercent: normalizeDecimalInput(input.commissionPercent),
    costAmount: normalizeDecimalInput(input.costAmount),
    description: input.description.trim(),
    name: input.name.trim(),
    priceAmount: normalizeDecimalInput(input.priceAmount),
    profitMarginPercent: normalizeDecimalInput(input.profitMarginPercent),
    serviceLaw116Id: input.serviceLaw116Id,
    serviceNbsId: input.serviceNbsId,
    status: input.status,
    taxCbsPercent: normalizeDecimalInput(input.taxCbsPercent),
    taxCidPercent: normalizeDecimalInput(input.taxCidPercent),
    taxCofinsPercent: normalizeDecimalInput(input.taxCofinsPercent),
    taxCsllPercent: normalizeDecimalInput(input.taxCsllPercent),
    taxIbsPercent: normalizeDecimalInput(input.taxIbsPercent),
    taxIcmsPercent: normalizeDecimalInput(input.taxIcmsPercent),
    taxIpiPercent: normalizeDecimalInput(input.taxIpiPercent),
    taxIrpjPercent: normalizeDecimalInput(input.taxIrpjPercent),
    taxPisPercent: normalizeDecimalInput(input.taxPisPercent),
    taxSimpleNationalPercent: normalizeDecimalInput(input.taxSimpleNationalPercent),
  };
}

async function findProvidedServiceForCompany(companyId: string, serviceId: string) {
  return prisma.providedService.findFirst({
    include: {
      createdBy: {
        select: { fullName: true },
      },
      municipalTaxRules: {
        include: {
          municipalTaxCode: true,
        },
        orderBy: [{ isDefault: "desc" }, { municipalityIbgeCode: "asc" }],
      },
      updatedBy: {
        select: { fullName: true },
      },
    },
    where: {
      companyId,
      deletedAt: null,
      id: serviceId,
    },
  });
}

export async function getProvidedServiceListPageData(
  searchParams?: ServiceSearchParams,
): Promise<ProvidedServiceListPageData> {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "view");
  const filters = parseProvidedServiceFilters(searchParams);
  const where = buildProvidedServiceWhere(context.company.id, filters);
  const requiresClassificationSort = filters.sort === "law116" || filters.sort === "nbs";
  const services = requiresClassificationSort
    ? sortProvidedServicesByClassificationCode(
        await prisma.providedService.findMany({
          include: {
            serviceLaw116: true,
            serviceNbs: true,
          },
          where,
        }),
        filters.sort,
        filters.direction,
      ).slice(
        (filters.page - 1) * providedServicePageSize,
        filters.page * providedServicePageSize,
      )
    : await prisma.providedService.findMany({
        include: {
          serviceLaw116: true,
          serviceNbs: true,
        },
        orderBy: buildProvidedServiceOrderBy(filters.sort, filters.direction),
        skip: (filters.page - 1) * providedServicePageSize,
        take: providedServicePageSize,
        where,
      });
  const totalItems = await prisma.providedService.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / providedServicePageSize));

  return {
    access: {
      services: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmProvidedServices,
      ),
    },
    companyName: context.company.name,
    filters: {
      ...filters,
      page: Math.min(filters.page, totalPages),
    },
    pagination: {
      page: Math.min(filters.page, totalPages),
      pageSize: providedServicePageSize,
      totalItems,
      totalPages,
    },
    services: services.map(mapProvidedServiceListRow),
  };
}

export async function getProvidedServiceFormPageData(
  serviceId?: string,
): Promise<ProvidedServiceFormPageData> {
  const context = await requirePermission(
    RESOURCE_CODES.crmProvidedServices,
    serviceId ? "view" : "add",
  );
  const [service, law116Codes, nbsCodes, municipalTaxCodes] = await Promise.all([
    serviceId
      ? findProvidedServiceForCompany(context.company.id, serviceId)
      : Promise.resolve(null),
    prisma.serviceLaw116Code.findMany({
      orderBy: [{ cTribNac: "asc" }],
    }),
    prisma.serviceNbsCode.findMany({
      orderBy: [{ code: "asc" }],
    }),
    prisma.municipalTaxCode.findMany({
      orderBy: [
        { municipalityName: "asc" },
        { municipalityIbgeCode: "asc" },
        { stateCode: "asc" },
        { cTribMun: "asc" },
      ],
    }),
  ]);

  if (serviceId && !service) {
    redirect("/crm/servicos");
  }

  const nextCode = service?.code ?? (await getNextProvidedServiceCode(context.company.id));

  return {
    access: {
      services: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmProvidedServices,
      ),
    },
    companyName: context.company.name,
    createdAt: service ? formatDateBr(service.createdAt) : "",
    createdByName: service?.createdBy?.fullName ?? "",
    isEditMode: Boolean(service),
    law116Options: [...law116Codes]
      .sort((codeA, codeB) => compareClassificationCode(codeA.cTribNac, codeB.cTribNac))
      .map(mapServiceOption),
    municipalTaxCodeOptions: sortMunicipalTaxCodes(
      municipalTaxCodes,
      "code",
      "asc",
    ).map(mapMunicipalTaxCodeOption),
    nbsOptions: [...nbsCodes]
      .sort((codeA, codeB) => compareClassificationCode(codeA.code, codeB.code))
      .map(mapServiceOption),
    service: mapProvidedServiceFormValues(service, nextCode),
    taxRules: service?.municipalTaxRules.map(mapTaxRuleRow) ?? [],
    updatedAt: service ? formatDateBr(service.updatedAt) : "",
    updatedByName: service?.updatedBy?.fullName ?? "",
  };
}

export async function saveProvidedService(input: ProvidedServiceWriteInput) {
  const isEdit = Boolean(input.serviceId);
  const context = await requirePermission(
    RESOURCE_CODES.crmProvidedServices,
    isEdit ? "edit" : "add",
  );
  const currentService = input.serviceId
    ? await findProvidedServiceForCompany(context.company.id, input.serviceId)
    : null;

  if (isEdit && !currentService) {
    return {
      ok: false as const,
      message: "O servico informado nao foi localizado na empresa ativa.",
    };
  }

  const [law116Code, nbsCode] = await Promise.all([
    prisma.serviceLaw116Code.findUnique({
      where: { id: input.serviceLaw116Id },
    }),
    prisma.serviceNbsCode.findUnique({
      where: { id: input.serviceNbsId },
    }),
  ]);

  if (!law116Code || law116Code.status !== "ACTIVE") {
    return {
      ok: false as const,
      fieldErrors: {
        serviceLaw116Id: ["Selecione um codigo ativo da Lei 116/03."],
      },
      message: "Selecione um codigo ativo da Lei 116/03.",
    };
  }

  if (!nbsCode || nbsCode.status !== "ACTIVE") {
    return {
      ok: false as const,
      fieldErrors: {
        serviceNbsId: ["Selecione um codigo NBS ativo."],
      },
      message: "Selecione um codigo NBS ativo.",
    };
  }

  const data = buildProvidedServiceWriteData(input);

  try {
    const savedService = isEdit
      ? await prisma.providedService.update({
          data: {
            ...data,
            updatedById: context.user.id,
          },
          where: { id: currentService!.id },
        })
      : await prisma.$transaction(async (tx) => {
          const nextCode = await getNextProvidedServiceCode(context.company.id, tx);

          return tx.providedService.create({
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
        ? "Servico atualizado com sucesso."
        : "Servico cadastrado com sucesso.",
      savedId: savedService.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        message: "Nao foi possivel salvar porque ja existe um servico com este codigo na empresa ativa.",
      };
    }

    throw error;
  }
}

export async function deleteProvidedService(serviceId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "delete");
  const service = await findProvidedServiceForCompany(context.company.id, serviceId);

  if (!service) {
    return {
      ok: false as const,
      message: "O servico informado nao foi localizado na empresa ativa.",
    };
  }

  await prisma.providedService.update({
    data: {
      deletedAt: new Date(),
      status: "BLOCKED",
      updatedById: context.user.id,
    },
    where: { id: service.id },
  });

  return {
    ok: true as const,
    message: "Servico excluido com sucesso. O registro foi preservado no historico.",
  };
}

export async function saveServiceMunicipalTaxRule(
  input: ServiceMunicipalTaxRuleWriteInput,
) {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "edit");
  const [service, municipalTaxCode] = await Promise.all([
    findProvidedServiceForCompany(context.company.id, input.serviceId),
    prisma.municipalTaxCode.findUnique({
      where: { id: input.municipalTaxCodeId },
    }),
  ]);

  if (!service) {
    return {
      ok: false as const,
      message: "O servico informado nao foi localizado na empresa ativa.",
    };
  }

  if (!municipalTaxCode || municipalTaxCode.status !== "ACTIVE") {
    return {
      ok: false as const,
      fieldErrors: {
        municipalTaxCodeId: ["Selecione um cTribMun ativo."],
      },
      message: "Selecione um cTribMun ativo.",
    };
  }

  if (municipalTaxCode.municipalityIbgeCode !== input.municipalityIbgeCode) {
    return {
      ok: false as const,
      fieldErrors: {
        municipalityIbgeCode: [
          "O municipio informado deve ser o mesmo municipio do cTribMun selecionado.",
        ],
      },
      message: "O municipio informado deve corresponder ao cTribMun selecionado.",
    };
  }

  const data = {
    issRate: normalizeDecimalInput(input.issRate),
    isDefault: input.isDefault,
    municipalTaxCodeId: input.municipalTaxCodeId,
    municipalityIbgeCode: input.municipalityIbgeCode,
    notes: normalizeNullable(input.notes),
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.serviceMunicipalTaxRule.updateMany({
          data: { isDefault: false },
          where: {
            companyId: context.company.id,
            serviceId: service.id,
          },
        });
      }

      if (input.ruleId) {
        await tx.serviceMunicipalTaxRule.update({
          data,
          where: { id: input.ruleId },
        });
        return;
      }

      await tx.serviceMunicipalTaxRule.create({
        data: {
          ...data,
          companyId: context.company.id,
          serviceId: service.id,
        },
      });
    });

    return {
      ok: true as const,
      message: input.ruleId
        ? "Vinculo municipal atualizado com sucesso."
        : "Vinculo municipal cadastrado com sucesso.",
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        fieldErrors: {
          municipalityIbgeCode: [
            "Este servico ja possui um cTribMun vinculado para o municipio informado.",
          ],
        },
        message:
          "Este servico ja possui um cTribMun vinculado para o municipio informado.",
      };
    }

    throw error;
  }
}

export async function deleteServiceMunicipalTaxRule(serviceId: string, ruleId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "edit");
  const rule = await prisma.serviceMunicipalTaxRule.findFirst({
    where: {
      companyId: context.company.id,
      id: ruleId,
      serviceId,
      service: {
        companyId: context.company.id,
        deletedAt: null,
      },
    },
  });

  if (!rule) {
    return {
      ok: false as const,
      message: "O vinculo municipal informado nao foi localizado.",
    };
  }

  await prisma.serviceMunicipalTaxRule.delete({
    where: { id: rule.id },
  });

  return {
    ok: true as const,
    message: "Vinculo municipal removido com sucesso.",
  };
}

function buildAuxiliaryWhere(
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

function sortMunicipalTaxCodes(
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

function sortNbsCodes(
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

function sortLaw116Codes(
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

function mapAuxiliaryRow(
  kind: ServiceAuxiliaryKind,
  row: ServiceLaw116Code | ServiceNbsCode | MunicipalTaxCode,
): AuxiliaryCodeListRow {
  if (kind === "municipalTax") {
    const taxCode = row as MunicipalTaxCode;

    return {
      category: "",
      code: taxCode.cTribMun,
      defaultIssRate: toPercent(taxCode.defaultIssRate),
      description: taxCode.description,
      id: taxCode.id,
      municipalityIbgeCode: taxCode.municipalityIbgeCode,
      municipalityName: taxCode.municipalityName,
      stateCode: taxCode.stateCode,
      status: taxCode.status,
    };
  }

  if (kind === "nbs") {
    const nbsCode = row as ServiceNbsCode;

    return {
      category: nbsCode.category ?? "",
      code: nbsCode.code,
      description: nbsCode.description,
      id: nbsCode.id,
      status: nbsCode.status,
    };
  }

  const lawCode = row as ServiceLaw116Code;

  return {
    category: lawCode.category ?? "",
    code: lawCode.cTribNac,
    description: lawCode.description,
    id: lawCode.id,
    requiresConstruction: lawCode.requiresConstruction,
    requiresEvent: lawCode.requiresEvent,
    requiresProperty: lawCode.requiresProperty,
    status: lawCode.status,
  };
}

async function countAuxiliaryRows(
  kind: ServiceAuxiliaryKind,
  where:
    | Prisma.ServiceLaw116CodeWhereInput
    | Prisma.ServiceNbsCodeWhereInput
    | Prisma.MunicipalTaxCodeWhereInput,
) {
  if (kind === "municipalTax") {
    return prisma.municipalTaxCode.count({
      where: where as Prisma.MunicipalTaxCodeWhereInput,
    });
  }

  if (kind === "nbs") {
    return prisma.serviceNbsCode.count({
      where: where as Prisma.ServiceNbsCodeWhereInput,
    });
  }

  return prisma.serviceLaw116Code.count({
    where: where as Prisma.ServiceLaw116CodeWhereInput,
  });
}

async function findAuxiliaryRows(
  kind: ServiceAuxiliaryKind,
  where:
    | Prisma.ServiceLaw116CodeWhereInput
    | Prisma.ServiceNbsCodeWhereInput
    | Prisma.MunicipalTaxCodeWhereInput,
  filters: AuxiliaryCodeListFilters,
) {
  const startIndex = (filters.page - 1) * auxiliaryCodePageSize;
  const endIndex = filters.page * auxiliaryCodePageSize;

  if (kind === "municipalTax") {
    const rows = await prisma.municipalTaxCode.findMany({
      where: where as Prisma.MunicipalTaxCodeWhereInput,
    });

    return sortMunicipalTaxCodes(rows, filters.sort, filters.direction).slice(
      startIndex,
      endIndex,
    );
  }

  if (kind === "nbs") {
    const rows = await prisma.serviceNbsCode.findMany({
      where: where as Prisma.ServiceNbsCodeWhereInput,
    });

    return sortNbsCodes(rows, filters.sort, filters.direction).slice(startIndex, endIndex);
  }

  const rows = await prisma.serviceLaw116Code.findMany({
    where: where as Prisma.ServiceLaw116CodeWhereInput,
  });

  return sortLaw116Codes(rows, filters.sort, filters.direction).slice(
    startIndex,
    endIndex,
  );
}

export async function getAuxiliaryCodeListPageData(
  kind: ServiceAuxiliaryKind,
  searchParams?: ServiceSearchParams,
): Promise<AuxiliaryCodeListPageData> {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "view");
  const filters = parseAuxiliaryCodeFilters(searchParams);
  const where = buildAuxiliaryWhere(kind, filters);
  const [totalItems, rows] = await Promise.all([
    countAuxiliaryRows(kind, where),
    findAuxiliaryRows(kind, where, filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / auxiliaryCodePageSize));

  return {
    access: {
      services: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmProvidedServices,
      ),
    },
    filters: {
      ...filters,
      page: Math.min(filters.page, totalPages),
    },
    kind,
    pagination: {
      page: Math.min(filters.page, totalPages),
      pageSize: auxiliaryCodePageSize,
      totalItems,
      totalPages,
    },
    rows: rows.map((row) => mapAuxiliaryRow(kind, row)),
  };
}

function emptyAuxiliaryCode(): AuxiliaryCodeFormValues {
  return {
    category: "",
    code: "",
    defaultIssRate: "0,00",
    description: "",
    id: null,
    municipalityIbgeCode: "",
    municipalityName: "",
    stateCode: "",
    requiresConstruction: false,
    requiresEvent: false,
    requiresProperty: false,
    status: "ACTIVE",
  };
}

function mapAuxiliaryFormValues(
  kind: ServiceAuxiliaryKind,
  row: ServiceLaw116Code | ServiceNbsCode | MunicipalTaxCode | null,
): AuxiliaryCodeFormValues {
  if (!row) {
    return emptyAuxiliaryCode();
  }

  if (kind === "municipalTax") {
    const taxCode = row as MunicipalTaxCode;

    return {
      ...emptyAuxiliaryCode(),
      code: taxCode.cTribMun,
      defaultIssRate: toDecimalInputFixed(taxCode.defaultIssRate),
      description: taxCode.description,
      id: taxCode.id,
      municipalityIbgeCode: taxCode.municipalityIbgeCode,
      municipalityName: taxCode.municipalityName,
      stateCode: taxCode.stateCode,
      status: taxCode.status,
    };
  }

  if (kind === "nbs") {
    const nbsCode = row as ServiceNbsCode;

    return {
      ...emptyAuxiliaryCode(),
      category: nbsCode.category ?? "",
      code: nbsCode.code,
      description: nbsCode.description,
      id: nbsCode.id,
      status: nbsCode.status,
    };
  }

  const lawCode = row as ServiceLaw116Code;

  return {
    ...emptyAuxiliaryCode(),
    category: lawCode.category ?? "",
    code: lawCode.cTribNac,
    description: lawCode.description,
    id: lawCode.id,
    requiresConstruction: lawCode.requiresConstruction,
    requiresEvent: lawCode.requiresEvent,
    requiresProperty: lawCode.requiresProperty,
    status: lawCode.status,
  };
}

async function findAuxiliaryCode(kind: ServiceAuxiliaryKind, id: string) {
  if (kind === "municipalTax") {
    return prisma.municipalTaxCode.findUnique({ where: { id } });
  }

  if (kind === "nbs") {
    return prisma.serviceNbsCode.findUnique({ where: { id } });
  }

  return prisma.serviceLaw116Code.findUnique({ where: { id } });
}

export async function getAuxiliaryCodeFormPageData(
  kind: ServiceAuxiliaryKind,
  auxiliaryCodeId?: string,
): Promise<AuxiliaryCodeFormPageData> {
  const context = await requirePermission(
    RESOURCE_CODES.crmProvidedServices,
    auxiliaryCodeId ? "view" : "add",
  );

  const [auxiliaryCode, municipalities] = await Promise.all([
    auxiliaryCodeId ? findAuxiliaryCode(kind, auxiliaryCodeId) : Promise.resolve(null),
    kind === "municipalTax"
      ? prisma.municipality.findMany({
          orderBy: [{ stateCode: "asc" }, { name: "asc" }, { ibgeCode: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  if (auxiliaryCodeId && !auxiliaryCode) {
    redirect(`/crm/servicos/${kind === "municipalTax" ? "ctribmun" : kind === "law116" ? "lei-116" : "nbs"}`);
  }

  return {
    access: {
      services: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmProvidedServices,
      ),
    },
    auxiliaryCode: mapAuxiliaryFormValues(kind, auxiliaryCode),
    isEditMode: Boolean(auxiliaryCode),
    kind,
    municipalityOptions: municipalities.map(mapMunicipalityOption),
  };
}

export async function saveAuxiliaryCode(
  kind: ServiceAuxiliaryKind,
  input: AuxiliaryCodeWriteInput,
) {
  const isEdit = Boolean(input.auxiliaryCodeId);

  await requirePermission(
    RESOURCE_CODES.crmProvidedServices,
    isEdit ? "edit" : "add",
  );

  try {
    if (kind === "municipalTax") {
      const municipality = await prisma.municipality.findUnique({
        where: { ibgeCode: input.municipalityIbgeCode.trim() },
      });

      if (!municipality) {
        return {
          ok: false as const,
          fieldErrors: {
            municipalityIbgeCode: ["Selecione um codigo de municipio valido."],
          },
          message: "Selecione um codigo de municipio valido.",
        };
      }

      const data = {
        cTribMun: input.code.trim(),
        defaultIssRate: normalizeDecimalInput(input.defaultIssRate),
        description: input.description.trim(),
        municipalityIbgeCode: municipality.ibgeCode,
        municipalityName: municipality.name,
        stateCode: municipality.stateCode,
        status: input.status,
      };
      const saved = isEdit
        ? await prisma.municipalTaxCode.update({
            data,
            where: { id: input.auxiliaryCodeId! },
          })
        : await prisma.municipalTaxCode.create({ data });

      return {
        ok: true as const,
        message: isEdit ? "cTribMun atualizado com sucesso." : "cTribMun cadastrado com sucesso.",
        savedId: saved.id,
      };
    }

    if (kind === "nbs") {
      const data = {
        category: normalizeNullable(input.category),
        code: input.code.trim(),
        description: input.description.trim(),
        status: input.status,
      };
      const saved = isEdit
        ? await prisma.serviceNbsCode.update({
            data,
            where: { id: input.auxiliaryCodeId! },
          })
        : await prisma.serviceNbsCode.create({ data });

      return {
        ok: true as const,
        message: isEdit ? "Codigo NBS atualizado com sucesso." : "Codigo NBS cadastrado com sucesso.",
        savedId: saved.id,
      };
    }

    const data = {
      category: normalizeNullable(input.category),
      cTribNac: input.code.trim(),
      description: input.description.trim(),
      requiresConstruction: input.requiresConstruction,
      requiresEvent: input.requiresEvent,
      requiresProperty: input.requiresProperty,
      status: input.status,
    };
    const saved = isEdit
      ? await prisma.serviceLaw116Code.update({
          data,
          where: { id: input.auxiliaryCodeId! },
        })
      : await prisma.serviceLaw116Code.create({ data });

    return {
      ok: true as const,
      message: isEdit
        ? "Codigo da Lei 116/03 atualizado com sucesso."
        : "Codigo da Lei 116/03 cadastrado com sucesso.",
      savedId: saved.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        message:
          "Nao foi possivel salvar porque ja existe um codigo igual cadastrado.",
      };
    }

    throw error;
  }
}

export async function inactivateAuxiliaryCode(
  kind: ServiceAuxiliaryKind,
  auxiliaryCodeId: string,
) {
  await requirePermission(RESOURCE_CODES.crmProvidedServices, "delete");

  if (kind === "municipalTax") {
    await prisma.municipalTaxCode.update({
      data: { status: "INACTIVE" },
      where: { id: auxiliaryCodeId },
    });

    return {
      ok: true as const,
      message: "cTribMun inativado com sucesso.",
    };
  }

  if (kind === "nbs") {
    await prisma.serviceNbsCode.update({
      data: { status: "INACTIVE" },
      where: { id: auxiliaryCodeId },
    });

    return {
      ok: true as const,
      message: "Codigo NBS inativado com sucesso.",
    };
  }

  await prisma.serviceLaw116Code.update({
    data: { status: "INACTIVE" },
    where: { id: auxiliaryCodeId },
  });

  return {
    ok: true as const,
    message: "Codigo da Lei 116/03 inativado com sucesso.",
  };
}

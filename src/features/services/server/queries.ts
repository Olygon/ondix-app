import "server-only";

import { redirect } from "next/navigation";
import type {
  Prisma,
  PrismaClient,
  ProvidedService,
  ServiceLaw116Code,
  ServiceNbsCode,
} from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import {
  auxiliaryCodePageSize,
  auxiliaryKindRoutes,
  providedServicePageSize,
  type ServiceAuxiliaryKind,
} from "@/features/services/constants/service-constants";
import type {
  AuxiliaryCodeListFilters,
  AuxiliaryCodeListPageData,
  ProvidedServiceFormPageData,
  ProvidedServiceListPageData,
} from "@/features/services/types/service-types";
import {
  applySortDirection,
  buildAuxiliaryWhere,
  buildProvidedServiceOrderBy,
  buildProvidedServiceWhere,
  compareClassificationCode,
  parseAuxiliaryCodeFilters,
  parseProvidedServiceFilters,
  sortLaw116Codes,
  sortMunicipalTaxCodes,
  sortNbsCodes,
  type ServiceSearchParams,
} from "@/features/services/server/helpers";
import {
  mapAuxiliaryFormValues,
  mapAuxiliaryRow,
  mapMunicipalTaxCodeOption,
  mapMunicipalityOption,
  mapProvidedServiceFormValues,
  mapProvidedServiceListRow,
  mapServiceOption,
  mapTaxRuleRow,
} from "@/features/services/server/mappers";

type ProvidedServiceDelegateClient = Pick<PrismaClient, "providedService">;

export type { ServiceSearchParams } from "@/features/services/server/helpers";

export async function getNextProvidedServiceCode(
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

export async function findProvidedServiceForCompany(companyId: string, serviceId: string) {
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

function sortProvidedServicesByClassificationCode(
  services: Array<
    ProvidedService & {
      serviceLaw116: ServiceLaw116Code;
      serviceNbs: ServiceNbsCode;
    }
  >,
  sort: "law116" | "nbs",
  direction: "asc" | "desc",
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

export async function getProvidedServiceListPageData(
  searchParams?: ServiceSearchParams,
): Promise<ProvidedServiceListPageData> {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "view");
  const filters = parseProvidedServiceFilters(searchParams);
  const where = buildProvidedServiceWhere(context.company.id, filters);
  const services =
    filters.sort === "law116" || filters.sort === "nbs"
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
) {
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
    redirect(auxiliaryKindRoutes[kind]);
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

import "server-only";

import { redirect } from "next/navigation";
import type { PrismaClient } from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { formatCpfCnpj, formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import {
  commercialProposalBaseRoute,
  commercialProposalPaymentMethodLabels,
  commercialProposalPageSize,
  commercialProposalStatusLabels,
} from "@/features/commercial-proposals/constants/commercial-proposal-constants";
import type {
  CommercialProposalFormPageData,
  CommercialProposalListPageData,
} from "@/features/commercial-proposals/types/commercial-proposal-types";
import {
  buildProposalOrderBy,
  buildProposalWhere,
  formatProposalCode,
  isCurrentUserApprovalAllowed,
  parseProposalFilters,
  toCurrency,
  toDecimalInput,
  toNumber,
  type CommercialProposalSearchParams,
} from "@/features/commercial-proposals/server/helpers";
import {
  mapCustomerOption,
  mapListRow,
  mapProposalFormValues,
  mapProposalItemFormValuesOrDefault,
  mapServiceOption,
} from "@/features/commercial-proposals/server/mappers";

type CommercialProposalDelegateClient = Pick<PrismaClient, "commercialProposal">;

export type { CommercialProposalSearchParams } from "@/features/commercial-proposals/server/helpers";

export async function getNextCommercialProposalCode(
  companyId: string,
  client: CommercialProposalDelegateClient = prisma,
) {
  const lastProposal = await client.commercialProposal.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
    where: { companyId },
  });

  return (lastProposal?.code ?? 0) + 1;
}

async function getCustomerOptions(companyId: string) {
  const customers = await prisma.customer.findMany({
    orderBy: [{ name: "asc" }],
    where: {
      companyId,
      deletedAt: null,
    },
  });

  return customers.map(mapCustomerOption);
}

async function getServiceOptions(companyId: string, selectedServiceIds: string[] = []) {
  const services = await prisma.providedService.findMany({
    orderBy: [{ code: "asc" }],
    where: {
      companyId,
      OR: [
        {
          deletedAt: null,
          status: "ACTIVE",
        },
        ...(selectedServiceIds.length > 0
          ? [
              {
                id: {
                  in: selectedServiceIds,
                },
              },
            ]
          : []),
      ],
    },
  });

  return services.map(mapServiceOption);
}

export async function findProposalForCompany(companyId: string, proposalId: string) {
  return prisma.commercialProposal.findFirst({
    include: {
      approvedBy: {
        select: { fullName: true },
      },
      createdBy: {
        select: { fullName: true },
      },
      customer: true,
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      updatedBy: {
        select: { fullName: true },
      },
    },
    where: {
      companyId,
      deletedAt: null,
      id: proposalId,
    },
  });
}

export async function getCommercialProposalListPageData(
  searchParams?: CommercialProposalSearchParams,
): Promise<CommercialProposalListPageData> {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "view",
  );
  const filters = parseProposalFilters(searchParams);
  const where = buildProposalWhere(context.company.id, filters);
  const [totalItems, proposals, customerOptions] = await Promise.all([
    prisma.commercialProposal.count({ where }),
    prisma.commercialProposal.findMany({
      include: {
        customer: true,
      },
      orderBy: buildProposalOrderBy(filters.sort, filters.direction),
      skip: (filters.page - 1) * commercialProposalPageSize,
      take: commercialProposalPageSize,
      where,
    }),
    getCustomerOptions(context.company.id),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / commercialProposalPageSize));

  return {
    access: {
      proposals: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmCommercialProposal,
      ),
    },
    canApprove: isCurrentUserApprovalAllowed(context),
    companyName: context.company.name,
    customerOptions,
    filters: {
      ...filters,
      page: Math.min(filters.page, totalPages),
    },
    pagination: {
      page: Math.min(filters.page, totalPages),
      pageSize: commercialProposalPageSize,
      totalItems,
      totalPages,
    },
    proposals: proposals.map(mapListRow),
  };
}

export async function getCommercialProposalFormPageData(
  proposalId?: string,
): Promise<CommercialProposalFormPageData> {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    proposalId ? "view" : "add",
  );
  const proposal = proposalId
    ? await findProposalForCompany(context.company.id, proposalId)
    : null;

  if (proposalId && !proposal) {
    redirect(commercialProposalBaseRoute);
  }

  const nextCode =
    proposal?.code ?? (await getNextCommercialProposalCode(context.company.id));
  const selectedServiceIds = proposal?.items.map((item) => item.serviceId) ?? [];
  const [customerOptions, serviceOptions] = await Promise.all([
    getCustomerOptions(context.company.id),
    getServiceOptions(context.company.id, selectedServiceIds),
  ]);

  return {
    access: {
      proposals: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmCommercialProposal,
      ),
    },
    canApprove: isCurrentUserApprovalAllowed(context),
    companyName: context.company.name,
    createdAt: proposal ? formatDateBr(proposal.createdAt) : "",
    createdByName: proposal?.createdBy?.fullName ?? "",
    currentUserName: context.user.fullName,
    customerOptions,
    isEditMode: Boolean(proposal),
    items: proposal
      ? mapProposalItemFormValuesOrDefault(proposal.items)
      : mapProposalItemFormValuesOrDefault([]),
    proposal: mapProposalFormValues(proposal, nextCode),
    serviceOptions,
    updatedAt: proposal ? formatDateBr(proposal.updatedAt) : "",
    updatedByName: proposal?.updatedBy?.fullName ?? "",
  };
}

export async function getCommercialProposalPdfPayload(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "view",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return null;
  }

  return {
    company: {
      city: context.company.city ?? "",
      email: context.company.email ?? "",
      legalName: context.company.legalName ?? context.company.name,
      name: context.company.name,
      phone: context.company.phone ?? "",
      stateCode: context.company.stateCode ?? "",
      street: [
        context.company.street,
        context.company.streetNumber,
        context.company.district,
      ]
        .filter(Boolean)
        .join(", "),
      taxId: context.company.taxId ?? "",
    },
    customer: {
      city: proposal.customer.city ?? "",
      document: formatCpfCnpj(proposal.customer.federalDocument),
      email: proposal.customer.email ?? "",
      name: proposal.customer.name,
      phone: proposal.customer.phone ?? proposal.customer.whatsapp ?? "",
      stateCode: proposal.customer.stateCode ?? "",
      street: [
        proposal.customer.street,
        proposal.customer.streetNumber,
        proposal.customer.neighborhood,
      ]
        .filter(Boolean)
        .join(", "),
    },
    items: proposal.items.map((item) => {
      const lineDiscount =
        toNumber(item.lineSubtotalAmount) - toNumber(item.lineTotalAmount);

      return {
        code: item.serviceCodeSnapshot,
        description: item.serviceDescriptionSnapshot || item.serviceNameSnapshot,
        discountAmount: toCurrency(lineDiscount),
        quantity: toDecimalInput(item.quantity),
        totalAmount: toCurrency(item.lineTotalAmount),
        unitPrice: toCurrency(item.unitPriceAmount),
      };
    }),
    proposal: {
      code: formatProposalCode(proposal.code),
      deliveryCostAmount: toCurrency(proposal.deliveryCostAmount),
      deliveryDeadline: proposal.deliveryDeadline ?? "",
      downPaymentAmount: toCurrency(proposal.downPaymentAmount),
      globalDiscountAmount: toCurrency(proposal.globalDiscountAmount),
      issueDate: formatDateBr(proposal.issueDate),
      materialCostAmount: toCurrency(proposal.materialCostAmount),
      notes: proposal.notes ?? "",
      otherCostAmount: toCurrency(proposal.otherCostAmount),
      paymentMethod: commercialProposalPaymentMethodLabels[proposal.paymentMethod],
      status: commercialProposalStatusLabels[proposal.status],
      subtotalAmount: toCurrency(proposal.subtotalAmount),
      totalAmount: toCurrency(proposal.totalAmount),
      totalDiscountAmount: toCurrency(proposal.totalDiscountAmount),
      validUntil: formatDateBr(proposal.validUntil),
    },
  };
}

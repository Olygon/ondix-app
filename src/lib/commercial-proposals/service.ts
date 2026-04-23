import "server-only";

import { redirect } from "next/navigation";
import type {
  CommercialProposal,
  CommercialProposalItem,
  CommercialProposalPaymentMethod,
  CommercialProposalStatus,
  Customer,
  Prisma,
  PrismaClient,
  ProvidedService,
  User,
} from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { isManagerialLevel } from "@/lib/access-management/constants";
import {
  commercialProposalBaseRoute,
  commercialProposalPageSize,
  commercialProposalPaymentMethodLabels,
  commercialProposalSortFields,
  commercialProposalStatusLabels,
  commercialProposalStatusOptions,
  type CommercialProposalSortDirection,
  type CommercialProposalSortField,
} from "@/lib/commercial-proposals/constants";
import type {
  CommercialProposalCustomerOption,
  CommercialProposalFormPageData,
  CommercialProposalFormValues,
  CommercialProposalItemFormValues,
  CommercialProposalListFilters,
  CommercialProposalListPageData,
  CommercialProposalListRow,
  CommercialProposalServiceOption,
} from "@/lib/commercial-proposals/types";
import { formatCpfCnpj, formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";

export type CommercialProposalSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type CommercialProposalWriteInput = {
  customerId: string;
  deliveryCostAmount: string;
  deliveryDeadline?: string;
  downPaymentAmount: string;
  globalDiscountAmount: string;
  issueDate: string;
  items: Array<{
    id?: string | null;
    lineDiscountAmount: string;
    lineDiscountPercent: string;
    quantity: string;
    serviceCodeSnapshot: string;
    serviceDescriptionSnapshot: string;
    serviceId: string;
    serviceNameSnapshot: string;
    sortOrder?: number;
    unitPriceAmount: string;
  }>;
  materialCostAmount: string;
  notes?: string;
  otherCostAmount: string;
  paymentMethod: CommercialProposalPaymentMethod;
  proposalId?: string | null;
  status: CommercialProposalStatus;
  validUntil: string;
};

export type CommercialProposalPdfPayload = {
  company: {
    city: string;
    email: string;
    legalName: string;
    name: string;
    phone: string;
    stateCode: string;
    street: string;
    taxId: string;
  };
  customer: {
    city: string;
    document: string;
    email: string;
    name: string;
    phone: string;
    stateCode: string;
    street: string;
  };
  items: Array<{
    code: string;
    description: string;
    discountAmount: string;
    quantity: string;
    totalAmount: string;
    unitPrice: string;
  }>;
  proposal: {
    code: string;
    deliveryCostAmount: string;
    deliveryDeadline: string;
    downPaymentAmount: string;
    globalDiscountAmount: string;
    issueDate: string;
    materialCostAmount: string;
    notes: string;
    otherCostAmount: string;
    paymentMethod: string;
    status: string;
    subtotalAmount: string;
    totalAmount: string;
    totalDiscountAmount: string;
    validUntil: string;
  };
};

type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

type CommercialProposalDelegateClient = Pick<PrismaClient, "commercialProposal">;
type CalculatedProposalItem = {
  data: {
    lineDiscountAmount: string;
    lineDiscountPercent: string;
    lineSubtotalAmount: string;
    lineTotalAmount: string;
    quantity: string;
    serviceCodeSnapshot: string;
    serviceDescriptionSnapshot: string;
    serviceId: string;
    serviceNameSnapshot: string;
    sortOrder: number;
    unitPriceAmount: string;
  };
  discountTotal: number;
  subtotal: number;
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

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function normalizeDecimalInput(value?: string | null) {
  const normalized = value?.trim().replace(/\./g, "").replace(",", ".") ?? "";

  return normalized || "0";
}

function normalizeDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  date.setHours(0, 0, 0, 0);

  return date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toDateInput(value?: Date | string | null) {
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function moneyString(value: number) {
  return roundMoney(value).toFixed(2);
}

function formatProposalCode(code: number) {
  return `PC-${String(code).padStart(5, "0")}`;
}

function formatServiceCode(code: number) {
  return `SRV-${String(code).padStart(4, "0")}`;
}

function parseProposalFilters(
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

function buildProposalWhere(
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

function buildProposalOrderBy(
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

function mapCustomerOption(customer: Customer): CommercialProposalCustomerOption {
  return {
    document: formatCpfCnpj(customer.federalDocument),
    email: customer.email ?? "",
    id: customer.id,
    label: `${customer.name} - ${formatCpfCnpj(customer.federalDocument)}`,
    name: customer.name,
  };
}

function mapServiceOption(service: ProvidedService): CommercialProposalServiceOption {
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

function mapListRow(
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

function isCurrentUserApprovalAllowed(context: Awaited<ReturnType<typeof requirePermission>>) {
  return (
    context.accessProfile.isAdministrator ||
    isManagerialLevel(context.accessProfile.level)
  );
}

async function getNextCommercialProposalCode(
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

function mapProposalFormValues(
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

function mapProposalItemFormValues(
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

async function findProposalForCompany(companyId: string, proposalId: string) {
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

function calculateProposal(input: CommercialProposalWriteInput) {
  const items = input.items.map((item, index) => {
    const unitPrice = toNumber(normalizeDecimalInput(item.unitPriceAmount));
    const quantity = toNumber(normalizeDecimalInput(item.quantity));
    const discountAmount = toNumber(normalizeDecimalInput(item.lineDiscountAmount));
    const discountPercent = toNumber(normalizeDecimalInput(item.lineDiscountPercent));
    const lineSubtotal = roundMoney(unitPrice * quantity);
    const discountFromPercent = roundMoney(lineSubtotal * (discountPercent / 100));
    const lineDiscountTotal = roundMoney(discountAmount + discountFromPercent);
    const lineTotal = roundMoney(lineSubtotal - lineDiscountTotal);

    if (lineTotal < 0) {
      return {
        error: `O desconto do item ${index + 1} nao pode deixar o total negativo.`,
      } as const;
    }

    return {
      data: {
        lineDiscountAmount: moneyString(discountAmount),
        lineDiscountPercent: normalizeDecimalInput(item.lineDiscountPercent),
        lineSubtotalAmount: moneyString(lineSubtotal),
        lineTotalAmount: moneyString(lineTotal),
        quantity: normalizeDecimalInput(item.quantity),
        serviceCodeSnapshot: item.serviceCodeSnapshot.trim(),
        serviceDescriptionSnapshot: item.serviceDescriptionSnapshot.trim(),
        serviceId: item.serviceId,
        serviceNameSnapshot: item.serviceNameSnapshot.trim(),
        sortOrder: item.sortOrder ?? index,
        unitPriceAmount: moneyString(unitPrice),
      },
      discountTotal: lineDiscountTotal,
      subtotal: lineSubtotal,
    } as const;
  });

  const firstError = items.find((item) => "error" in item);

  if (firstError && "error" in firstError) {
    return {
      ok: false as const,
      message: firstError.error,
    };
  }

  const calculatedItems = items as CalculatedProposalItem[];
  const subtotal = roundMoney(
    calculatedItems.reduce((total, item) => total + item.subtotal, 0),
  );
  const itemDiscounts = roundMoney(
    calculatedItems.reduce((total, item) => total + item.discountTotal, 0),
  );
  const globalDiscount = toNumber(normalizeDecimalInput(input.globalDiscountAmount));
  const deliveryCost = toNumber(normalizeDecimalInput(input.deliveryCostAmount));
  const materialCost = toNumber(normalizeDecimalInput(input.materialCostAmount));
  const otherCost = toNumber(normalizeDecimalInput(input.otherCostAmount));
  const totalDiscount = roundMoney(itemDiscounts + globalDiscount);
  const totalAmount = roundMoney(
    subtotal - totalDiscount + deliveryCost + materialCost + otherCost,
  );

  if (totalAmount < 0) {
    return {
      ok: false as const,
      message: "Os descontos da proposta nao podem deixar o total final negativo.",
    };
  }

  return {
    ok: true as const,
    items: calculatedItems.map((item) => item.data),
    totals: {
      deliveryCostAmount: moneyString(deliveryCost),
      globalDiscountAmount: moneyString(globalDiscount),
      materialCostAmount: moneyString(materialCost),
      otherCostAmount: moneyString(otherCost),
      subtotalAmount: moneyString(subtotal),
      totalAmount: moneyString(totalAmount),
      totalDiscountAmount: moneyString(totalDiscount),
    },
  };
}

async function ensureCustomerForProposal(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      deletedAt: null,
      id: customerId,
    },
  });
}

async function ensureServicesForProposal(companyId: string, serviceIds: string[]) {
  const uniqueServiceIds = Array.from(new Set(serviceIds));
  const services = await prisma.providedService.findMany({
    select: { id: true },
    where: {
      companyId,
      deletedAt: null,
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  return services.length === uniqueServiceIds.length;
}

function getStatusDateData(
  status: CommercialProposalStatus,
  currentProposal?: CommercialProposal | null,
) {
  const now = new Date();

  return {
    expiredAt:
      status === "EXPIRED" && !currentProposal?.expiredAt
        ? now
        : currentProposal?.expiredAt,
    rejectedAt:
      status === "REJECTED" && !currentProposal?.rejectedAt
        ? now
        : currentProposal?.rejectedAt,
  };
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
    items:
      proposal?.items.map(mapProposalItemFormValues) ?? [emptyItemFormValues()],
    proposal: mapProposalFormValues(proposal, nextCode),
    serviceOptions,
    updatedAt: proposal ? formatDateBr(proposal.updatedAt) : "",
    updatedByName: proposal?.updatedBy?.fullName ?? "",
  };
}

export async function saveCommercialProposal(input: CommercialProposalWriteInput) {
  const isEdit = Boolean(input.proposalId);
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    isEdit ? "edit" : "add",
  );
  const [currentProposal, customer, servicesAreValid] = await Promise.all([
    input.proposalId
      ? findProposalForCompany(context.company.id, input.proposalId)
      : Promise.resolve(null),
    ensureCustomerForProposal(context.company.id, input.customerId),
    ensureServicesForProposal(
      context.company.id,
      input.items.map((item) => item.serviceId),
    ),
  ]);

  if (isEdit && !currentProposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (currentProposal?.status === "CONTRACTED" || currentProposal?.contractId) {
    return {
      ok: false as const,
      message: "Propostas contratadas nao podem ser alteradas.",
    };
  }

  if (!customer) {
    return {
      ok: false as const,
      fieldErrors: {
        customerId: ["Selecione um cliente da empresa ativa."],
      },
      message: "Selecione um cliente da empresa ativa.",
    };
  }

  if (!servicesAreValid) {
    return {
      ok: false as const,
      fieldErrors: {
        items: ["Todos os itens devem usar servicos da empresa ativa."],
      },
      message: "Revise os servicos selecionados nos itens da proposta.",
    };
  }

  const calculated = calculateProposal(input);

  if (!calculated.ok) {
    return {
      ok: false as const,
      fieldErrors: {
        items: [calculated.message],
      },
      message: calculated.message,
    };
  }

  const statusDates = getStatusDateData(input.status, currentProposal);
  const proposalData = {
    ...calculated.totals,
    customerId: customer.id,
    deliveryDeadline: normalizeNullable(input.deliveryDeadline),
    downPaymentAmount: normalizeDecimalInput(input.downPaymentAmount),
    issueDate: normalizeDateInput(input.issueDate),
    notes: normalizeNullable(input.notes),
    paymentMethod: input.paymentMethod,
    status: input.status,
    validUntil: normalizeDateInput(input.validUntil),
    ...statusDates,
  };

  try {
    const savedProposal = isEdit
      ? await prisma.$transaction(async (tx) => {
          await tx.commercialProposalItem.deleteMany({
            where: {
              companyId: context.company.id,
              proposalId: currentProposal!.id,
            },
          });
          const updated = await tx.commercialProposal.update({
            data: {
              ...proposalData,
              updatedById: context.user.id,
            },
            where: { id: currentProposal!.id },
          });
          await tx.commercialProposalItem.createMany({
            data: calculated.items.map((item) => ({
              ...item,
              companyId: context.company.id,
              proposalId: updated.id,
            })),
          });

          return updated;
        })
      : await prisma.$transaction(async (tx) => {
          const nextCode = await getNextCommercialProposalCode(context.company.id, tx);
          const created = await tx.commercialProposal.create({
            data: {
              ...proposalData,
              code: nextCode,
              companyId: context.company.id,
              createdById: context.user.id,
              updatedById: context.user.id,
            },
          });
          await tx.commercialProposalItem.createMany({
            data: calculated.items.map((item) => ({
              ...item,
              companyId: context.company.id,
              proposalId: created.id,
            })),
          });

          return created;
        });

    return {
      ok: true as const,
      message: isEdit
        ? "Proposta comercial atualizada com sucesso."
        : "Proposta comercial cadastrada com sucesso.",
      savedId: savedProposal.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        message:
          "Nao foi possivel salvar porque ja existe uma proposta com este codigo na empresa ativa.",
      };
    }

    throw error;
  }
}

export async function deleteCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "delete",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.status === "CONTRACTED" || proposal.contractId) {
    return {
      ok: false as const,
      message:
        "Propostas contratadas ou vinculadas a contrato nao podem ser excluidas.",
    };
  }

  await prisma.commercialProposal.update({
    data: {
      deletedAt: new Date(),
      status: "INACTIVE",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: "Proposta excluida com sucesso. O registro foi preservado no historico.",
  };
}

export async function inactivateCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.status === "CONTRACTED" || proposal.contractId) {
    return {
      ok: false as const,
      message:
        "Propostas contratadas ou vinculadas a contrato nao podem ser inativadas.",
    };
  }

  await prisma.commercialProposal.update({
    data: {
      status: "INACTIVE",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: "Proposta inativada com sucesso.",
  };
}

export async function approveCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );

  if (!isCurrentUserApprovalAllowed(context)) {
    return {
      ok: false as const,
      message: "A aprovacao e permitida apenas para usuario gestor ou administrador.",
    };
  }

  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.items.length === 0) {
    return {
      ok: false as const,
      message: "A proposta precisa ter pelo menos um item para ser aprovada.",
    };
  }

  if (proposal.contractId) {
    return {
      ok: false as const,
      message: "Propostas contratadas nao podem ser aprovadas novamente.",
    };
  }

  await prisma.commercialProposal.update({
    data: {
      approvedAt: new Date(),
      approvedById: context.user.id,
      status: "APPROVED",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: `Proposta aprovada por ${context.user.fullName}.`,
  };
}

export async function sendCommercialProposalByEmail(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (!proposal.customer.email) {
    return {
      ok: false as const,
      message: "O cliente nao possui e-mail cadastrado para envio.",
    };
  }

  if (proposal.status === "CONTRACTED" || proposal.contractId) {
    return {
      ok: false as const,
      message: "Propostas contratadas nao podem ser reenviadas por este fluxo.",
    };
  }

  const pdfUrl = `${commercialProposalBaseRoute}/${proposal.id}/pdf`;

  console.info("[ONDIX commercial proposal] Mock e-mail enviado", {
    customerEmail: proposal.customer.email,
    customerId: proposal.customer.id,
    message: `Proposta ${formatProposalCode(proposal.code)} disponivel em ${pdfUrl}`,
    proposalId: proposal.id,
  });

  await prisma.commercialProposal.update({
    data: {
      status: proposal.status === "APPROVED" ? "APPROVED" : "SENT",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: `Envio por e-mail registrado em mock para ${proposal.customer.email}.`,
  };
}

export async function generateContractFromCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.status !== "APPROVED") {
    return {
      ok: false as const,
      message: "A geracao de contrato exige uma proposta aprovada.",
    };
  }

  if (proposal.contractId) {
    return {
      ok: false as const,
      message: "Esta proposta ja possui contrato vinculado.",
    };
  }

  return {
    ok: true as const,
    message:
      "Fluxo preparado: o modulo de contratos ainda nao esta implementado. A proposta permanece aprovada e pronta para conversao futura.",
  };
}

export async function getCommercialProposalPdfPayload(
  proposalId: string,
): Promise<CommercialProposalPdfPayload | null> {
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

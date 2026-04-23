import "server-only";

import { redirect } from "next/navigation";
import type {
  Customer,
  CustomerRiskAnalysis,
  CustomerRiskAnalysisHistory,
  CustomerRiskEvent,
  CustomerRiskExternalQuery,
  CustomerRiskExternalSource,
  User,
} from "@prisma/client";

import {
  getPermissionAccess as getPermissionAccessFromMatrix,
} from "@/lib/access-control/permissions";
import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import {
  riskAnalysisStatusLabels,
  riskEventTypeLabels,
  riskExternalSourceLabels,
  riskFinalOpinionLabels,
  riskHistorySourceLabels,
  riskQueryStatusLabels,
} from "@/lib/customer-risk/constants";
import type {
  CustomerRiskAnalysisPageData,
  RiskAnalysisFormValues,
  RiskAnalysisHistoryRow,
  RiskEventRow,
  RiskExternalQueryView,
} from "@/lib/customer-risk/types";
import { formatCustomerCode } from "@/lib/customer/formatters";
import { formatCpfCnpj, formatDateBr } from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";

type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

type CustomerRiskAnalysisWithRelations = CustomerRiskAnalysis & {
  analystUser?: Pick<User, "fullName"> | null;
};

type CustomerRiskHistoryWithRelations = CustomerRiskAnalysisHistory & {
  createdBy?: Pick<User, "fullName"> | null;
};

type CustomerRiskExternalQueryWithRelations = CustomerRiskExternalQuery & {
  requestedBy?: Pick<User, "fullName"> | null;
};

type CustomerRiskEventWithRelations = CustomerRiskEvent & {
  createdBy?: Pick<User, "fullName"> | null;
};

export type RiskAnalysisWriteInput = {
  activeContractScore?: string;
  allowsInstallments: boolean;
  analysisStatus: RiskAnalysisFormValues["analysisStatus"];
  approvedSalesLimit?: string;
  commercialDependencyScore?: string;
  customerId: string;
  defaultFrequencyScore?: string;
  externalRestrictionScore?: string;
  externalScoreCriterion?: string;
  finalOpinion?: RiskAnalysisFormValues["finalOpinion"];
  financialVolumeScore?: string;
  internalScore?: string;
  latePaymentHistoryScore?: string;
  manualAnalystRating?: string;
  maxTermDays?: string;
  notes?: string;
  recommendedSalesLimit?: string;
  relationshipTimeScore?: string;
  requiresAdditionalGuarantee: boolean;
  requiresDownPayment: boolean;
  requiresFormalContract: boolean;
  riskAnalysisId: string;
  riskConcentrationScore?: string;
  riskLevel: RiskAnalysisFormValues["riskLevel"];
};

function toNumber(value?: DecimalLike | number | string | null) {
  if (value === null || value === undefined || value === "") {
    return null;
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
  const amount = toNumber(value);

  if (amount === null || Number.isNaN(amount)) {
    return "Nao informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(amount);
}

function toMoneyInput(value?: DecimalLike | number | string | null) {
  const amount = toNumber(value);

  if (amount === null || Number.isNaN(amount)) {
    return "";
  }

  return amount.toFixed(2);
}

function parseOptionalInt(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

function parseOptionalDecimal(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  return Number(trimmed).toFixed(2);
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function calculateConsolidatedScore(internalScore?: number | null, externalScore?: number | null) {
  if (internalScore !== null && internalScore !== undefined && externalScore !== null && externalScore !== undefined) {
    return Math.round(internalScore * 0.7 + externalScore * 0.3);
  }

  return internalScore ?? externalScore ?? null;
}

function getScoreLabel(score?: number | null) {
  return score === null || score === undefined ? "Nao informado" : String(score);
}

function getRelationshipTime(createdAt: Date) {
  const now = new Date();
  const diffInDays = Math.max(
    0,
    Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000),
  );

  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "dia" : "dias"}`;
  }

  const months = Math.floor(diffInDays / 30);

  if (months < 12) {
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return `${years} ${years === 1 ? "ano" : "anos"}${remainingMonths ? ` e ${remainingMonths} meses` : ""}`;
}

async function findCustomerForRisk(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      deletedAt: null,
      id: customerId,
    },
  });
}

async function findRiskAnalysisForCompany(
  companyId: string,
  customerId: string,
  riskAnalysisId: string,
) {
  return prisma.customerRiskAnalysis.findFirst({
    where: {
      companyId,
      customerId,
      id: riskAnalysisId,
    },
  });
}

function buildBaseData(customer: Customer): CustomerRiskAnalysisPageData["baseData"] {
  return {
    averageRevenue: "Aguardando modulo financeiro",
    customerDocument: formatCpfCnpj(customer.federalDocument),
    customerName: customer.name,
    customerType: customer.type,
    defaultHistory: "Sem historico financeiro integrado",
    lateEventCount: "0 ocorrencias registradas",
    longestDelay: "Aguardando contas a receber",
    openAmount: toCurrency(0),
    overdueAmount: toCurrency(0),
    overdueTitlesCount: "0 titulos",
    relationshipTime: getRelationshipTime(customer.createdAt),
    receivedAmount: "Aguardando contas a receber",
  };
}

function mapRiskAnalysisForm(
  riskAnalysis: CustomerRiskAnalysis,
): RiskAnalysisFormValues & { id: string } {
  const consolidatedScore = calculateConsolidatedScore(
    riskAnalysis.internalScore,
    riskAnalysis.externalScore,
  );

  return {
    activeContractScore: riskAnalysis.activeContractScore?.toString() ?? "",
    allowsInstallments: riskAnalysis.allowsInstallments,
    analysisStatus: riskAnalysis.analysisStatus,
    approvedSalesLimit: toMoneyInput(riskAnalysis.approvedSalesLimit),
    commercialDependencyScore: riskAnalysis.commercialDependencyScore?.toString() ?? "",
    consolidatedScore: consolidatedScore?.toString() ?? "",
    defaultFrequencyScore: riskAnalysis.defaultFrequencyScore?.toString() ?? "",
    externalRestrictionScore: riskAnalysis.externalRestrictionScore?.toString() ?? "",
    externalScore: riskAnalysis.externalScore?.toString() ?? "",
    externalScoreCriterion: riskAnalysis.externalScoreCriterion?.toString() ?? "",
    finalOpinion: riskAnalysis.finalOpinion ?? "",
    financialVolumeScore: riskAnalysis.financialVolumeScore?.toString() ?? "",
    id: riskAnalysis.id,
    internalScore: riskAnalysis.internalScore?.toString() ?? "",
    latePaymentHistoryScore: riskAnalysis.latePaymentHistoryScore?.toString() ?? "",
    manualAnalystRating: riskAnalysis.manualAnalystRating ?? "",
    maxTermDays: riskAnalysis.maxTermDays?.toString() ?? "",
    notes: riskAnalysis.notes ?? "",
    recommendedSalesLimit: toMoneyInput(riskAnalysis.recommendedSalesLimit),
    relationshipTimeScore: riskAnalysis.relationshipTimeScore?.toString() ?? "",
    requiresAdditionalGuarantee: riskAnalysis.requiresAdditionalGuarantee,
    requiresDownPayment: riskAnalysis.requiresDownPayment,
    requiresFormalContract: riskAnalysis.requiresFormalContract,
    riskConcentrationScore: riskAnalysis.riskConcentrationScore?.toString() ?? "",
    riskLevel: riskAnalysis.riskLevel,
  };
}

function buildSummary(
  riskAnalysis: CustomerRiskAnalysisWithRelations | null,
): CustomerRiskAnalysisPageData["summary"] {
  if (!riskAnalysis) {
    return {
      analystName: "Nao informado",
      analysisDate: "Sem analise",
      analysisStatus: null,
      approvedSalesLimit: "Nao informado",
      consolidatedScore: "Nao informado",
      recommendedSalesLimit: "Nao informado",
      riskLevel: "NOT_CLASSIFIED",
    };
  }

  return {
    analystName: riskAnalysis.analystUser?.fullName ?? "Nao informado",
    analysisDate: riskAnalysis.analysisDate
      ? formatDateBr(riskAnalysis.analysisDate)
      : "Sem data",
    analysisStatus: riskAnalysis.analysisStatus,
    approvedSalesLimit: toCurrency(riskAnalysis.approvedSalesLimit),
    consolidatedScore: getScoreLabel(
      calculateConsolidatedScore(riskAnalysis.internalScore, riskAnalysis.externalScore),
    ),
    recommendedSalesLimit: toCurrency(riskAnalysis.recommendedSalesLimit),
    riskLevel: riskAnalysis.riskLevel,
  };
}

function mapHistoryRow(history: CustomerRiskHistoryWithRelations): RiskAnalysisHistoryRow {
  return {
    approvedSalesLimit: toCurrency(history.approvedSalesLimit),
    createdAt: formatDateBr(history.createdAt),
    createdByName: history.createdBy?.fullName ?? "Nao informado",
    finalOpinion: history.finalOpinion
      ? riskFinalOpinionLabels[history.finalOpinion]
      : "Nao informado",
    id: history.id,
    notes: history.notes ?? "",
    riskLevel: history.riskLevel,
    score: getScoreLabel(history.score),
    source: riskHistorySourceLabels[history.source],
  };
}

function mapEventRow(event: CustomerRiskEventWithRelations): RiskEventRow {
  return {
    createdAt: formatDateBr(event.createdAt),
    createdByName: event.createdBy?.fullName ?? "Nao informado",
    description: event.description,
    eventType: riskEventTypeLabels[event.eventType],
    id: event.id,
    notes: event.notes ?? "",
    scoreImpact: event.scoreImpact > 0 ? `+${event.scoreImpact}` : String(event.scoreImpact),
  };
}

function buildExternalQueryView(
  riskAnalysis: CustomerRiskAnalysisWithRelations | null,
  queries: CustomerRiskExternalQueryWithRelations[],
): RiskExternalQueryView {
  const lastSerasa = queries.find((query) => query.sourceType === "SERASA");
  const lastCentralBank = queries.find((query) => query.sourceType === "CENTRAL_BANK");

  return {
    centralBankConsulted: Boolean(lastCentralBank),
    centralBankLastQueryDate: lastCentralBank?.queryDate
      ? formatDateBr(lastCentralBank.queryDate)
      : "Nao consultado",
    centralBankSummary:
      lastCentralBank?.summaryResult ?? "Integracao com Banco Central ainda nao habilitada.",
    consolidatedExternalScore: getScoreLabel(riskAnalysis?.externalScore),
    integrationStatus:
      queries[0] && queries[0].queryStatus !== "NOT_ENABLED"
        ? riskQueryStatusLabels[queries[0].queryStatus]
        : "Integracoes externas nao habilitadas",
    queryRows: queries.map((query) => ({
      createdAt: formatDateBr(query.createdAt),
      id: query.id,
      requestedByName: query.requestedBy?.fullName ?? "Nao informado",
      sourceType: query.sourceType,
      status: riskQueryStatusLabels[query.queryStatus],
      summaryResult: query.summaryResult ?? "",
    })),
    serasaConsulted: Boolean(lastSerasa),
    serasaLastQueryDate: lastSerasa?.queryDate
      ? formatDateBr(lastSerasa.queryDate)
      : "Nao consultado",
    serasaSummary:
      lastSerasa?.summaryResult ?? "Integracao com Serasa ainda nao habilitada.",
  };
}

export async function getCustomerRiskAnalysisPageData(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "view");
  const customer = await findCustomerForRisk(context.company.id, customerId);

  if (!customer) {
    redirect("/crm/cliente");
  }

  const [riskAnalysis, histories, queries, events] = await Promise.all([
    prisma.customerRiskAnalysis.findFirst({
      include: {
        analystUser: {
          select: { fullName: true },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      where: {
        companyId: context.company.id,
        customerId: customer.id,
      },
    }),
    prisma.customerRiskAnalysisHistory.findMany({
      include: {
        createdBy: {
          select: { fullName: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
      where: {
        companyId: context.company.id,
        customerId: customer.id,
      },
    }),
    prisma.customerRiskExternalQuery.findMany({
      include: {
        requestedBy: {
          select: { fullName: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
      where: {
        companyId: context.company.id,
        customerId: customer.id,
      },
    }),
    prisma.customerRiskEvent.findMany({
      include: {
        createdBy: {
          select: { fullName: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
      where: {
        companyId: context.company.id,
        customerId: customer.id,
      },
    }),
  ]);

  return {
    access: {
      customers: getPermissionAccessFromMatrix(
        context.permissions,
        RESOURCE_CODES.crmCustomer,
      ),
    },
    baseData: buildBaseData(customer),
    companyName: context.company.name,
    customer: {
      code: formatCustomerCode(customer.code, context.company.name),
      document: formatCpfCnpj(customer.federalDocument),
      id: customer.id,
      name: customer.name,
      type: customer.type,
    },
    events: events.map(mapEventRow),
    externalQuery: buildExternalQueryView(riskAnalysis, queries),
    hasAnalysis: Boolean(riskAnalysis),
    histories: histories.map(mapHistoryRow),
    riskAnalysis: riskAnalysis ? mapRiskAnalysisForm(riskAnalysis) : null,
    summary: buildSummary(riskAnalysis),
  } satisfies CustomerRiskAnalysisPageData;
}

export async function startCustomerRiskAnalysis(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const customer = await findCustomerForRisk(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const existingAnalysis = await prisma.customerRiskAnalysis.findFirst({
    orderBy: [{ updatedAt: "desc" }],
    where: {
      companyId: context.company.id,
      customerId: customer.id,
    },
  });

  if (existingAnalysis) {
    return {
      ok: true as const,
      message: "A analise de risco deste cliente ja foi iniciada.",
      riskAnalysisId: existingAnalysis.id,
    };
  }

  const analysis = await prisma.$transaction(async (tx) => {
    const created = await tx.customerRiskAnalysis.create({
      data: {
        allowsInstallments: true,
        analysisDate: new Date(),
        analystUserId: context.user.id,
        companyId: context.company.id,
        customerId: customer.id,
        riskLevel: "NOT_CLASSIFIED",
      },
    });

    await tx.customerRiskAnalysisHistory.create({
      data: {
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        notes: "Analise de risco iniciada.",
        riskAnalysisId: created.id,
        riskLevel: "NOT_CLASSIFIED",
        source: "SYSTEM",
      },
    });

    await tx.customerRiskEvent.create({
      data: {
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        description: "Analise de risco iniciada para o cliente.",
        eventType: "ANALYSIS_STARTED",
        riskAnalysisId: created.id,
      },
    });

    return created;
  });

  return {
    ok: true as const,
    message: "Analise de risco iniciada com sucesso.",
    riskAnalysisId: analysis.id,
  };
}

export async function saveCustomerRiskAnalysis(input: RiskAnalysisWriteInput) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const [customer, currentAnalysis] = await Promise.all([
    findCustomerForRisk(context.company.id, input.customerId),
    findRiskAnalysisForCompany(
      context.company.id,
      input.customerId,
      input.riskAnalysisId,
    ),
  ]);

  if (!customer || !currentAnalysis) {
    return {
      ok: false as const,
      message: "A analise informada nao foi localizada para a empresa ativa.",
    };
  }

  const internalScore = parseOptionalInt(input.internalScore);
  const externalScore = currentAnalysis.externalScore;
  const consolidatedScore = calculateConsolidatedScore(internalScore, externalScore);
  const approvedSalesLimit = parseOptionalDecimal(input.approvedSalesLimit);
  const recommendedSalesLimit = parseOptionalDecimal(input.recommendedSalesLimit);
  const previousScore = calculateConsolidatedScore(
    currentAnalysis.internalScore,
    currentAnalysis.externalScore,
  );
  const scoreImpact =
    consolidatedScore !== null && previousScore !== null
      ? consolidatedScore - previousScore
      : 0;

  const savedAnalysis = await prisma.$transaction(async (tx) => {
    const updated = await tx.customerRiskAnalysis.update({
      data: {
        activeContractScore: parseOptionalInt(input.activeContractScore),
        allowsInstallments: input.allowsInstallments,
        analysisDate: new Date(),
        analysisStatus: input.analysisStatus,
        analystUserId: context.user.id,
        approvedSalesLimit,
        commercialDependencyScore: parseOptionalInt(input.commercialDependencyScore),
        consolidatedScore,
        defaultFrequencyScore: parseOptionalInt(input.defaultFrequencyScore),
        externalRestrictionScore: parseOptionalInt(input.externalRestrictionScore),
        externalScoreCriterion: parseOptionalInt(input.externalScoreCriterion),
        finalOpinion: input.finalOpinion || null,
        financialVolumeScore: parseOptionalInt(input.financialVolumeScore),
        internalScore,
        latePaymentHistoryScore: parseOptionalInt(input.latePaymentHistoryScore),
        manualAnalystRating: normalizeOptionalText(input.manualAnalystRating),
        maxTermDays: parseOptionalInt(input.maxTermDays),
        notes: normalizeOptionalText(input.notes),
        recommendedSalesLimit,
        relationshipTimeScore: parseOptionalInt(input.relationshipTimeScore),
        requiresAdditionalGuarantee: input.requiresAdditionalGuarantee,
        requiresDownPayment: input.requiresDownPayment,
        requiresFormalContract: input.requiresFormalContract,
        riskConcentrationScore: parseOptionalInt(input.riskConcentrationScore),
        riskLevel: input.riskLevel,
      },
      where: { id: currentAnalysis.id },
    });

    await tx.customerRiskAnalysisHistory.create({
      data: {
        approvedSalesLimit,
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        finalOpinion: input.finalOpinion || null,
        notes: normalizeOptionalText(input.notes) ?? "Analise de risco atualizada.",
        riskAnalysisId: currentAnalysis.id,
        riskLevel: input.riskLevel,
        score: consolidatedScore,
        source: "INTERNAL_REVIEW",
      },
    });

    await tx.customerRiskEvent.create({
      data: {
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        description: "Analise interna de risco atualizada.",
        eventType: "ANALYSIS_UPDATED",
        notes: normalizeOptionalText(input.notes),
        riskAnalysisId: currentAnalysis.id,
        scoreImpact,
      },
    });

    if (
      toMoneyInput(currentAnalysis.approvedSalesLimit) !==
      toMoneyInput(approvedSalesLimit)
    ) {
      await tx.customerRiskEvent.create({
        data: {
          companyId: context.company.id,
          createdById: context.user.id,
          customerId: customer.id,
          description: "Limite de vendas aprovado foi alterado.",
          eventType: "LIMIT_CHANGED",
          riskAnalysisId: currentAnalysis.id,
          scoreImpact: 0,
        },
      });
    }

    return updated;
  });

  return {
    ok: true as const,
    message: "Analise de risco salva com sucesso.",
    riskAnalysisId: savedAnalysis.id,
  };
}

export async function createExternalRiskQueryPlaceholder(input: {
  customerId: string;
  riskAnalysisId: string;
  sourceType: CustomerRiskExternalSource;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const [customer, riskAnalysis] = await Promise.all([
    findCustomerForRisk(context.company.id, input.customerId),
    findRiskAnalysisForCompany(
      context.company.id,
      input.customerId,
      input.riskAnalysisId,
    ),
  ]);

  if (!customer || !riskAnalysis) {
    return {
      ok: false as const,
      message: "Inicie a analise antes de registrar consultas externas.",
    };
  }

  const sourceLabel = riskExternalSourceLabels[input.sourceType];
  const summaryResult = `Consulta ${sourceLabel} preparada. A integracao externa ainda nao esta habilitada nesta etapa.`;

  await prisma.$transaction([
    prisma.customerRiskExternalQuery.create({
      data: {
        companyId: context.company.id,
        customerId: customer.id,
        queryDate: new Date(),
        queryStatus: "NOT_ENABLED",
        rawReference: `placeholder:${input.sourceType.toLowerCase()}`,
        requestedById: context.user.id,
        riskAnalysisId: riskAnalysis.id,
        sourceType: input.sourceType,
        summaryResult,
      },
    }),
    prisma.customerRiskAnalysisHistory.create({
      data: {
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        notes: summaryResult,
        riskAnalysisId: riskAnalysis.id,
        riskLevel: riskAnalysis.riskLevel,
        score: riskAnalysis.consolidatedScore,
        source: "EXTERNAL_QUERY",
      },
    }),
    prisma.customerRiskEvent.create({
      data: {
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        description: `Tentativa segura de consulta ${sourceLabel}.`,
        eventType: "MANUAL_NOTE",
        notes: summaryResult,
        riskAnalysisId: riskAnalysis.id,
      },
    }),
  ]);

  return {
    ok: true as const,
    message: summaryResult,
    riskAnalysisId: riskAnalysis.id,
  };
}

export async function reopenCustomerRiskAnalysis(input: {
  customerId: string;
  riskAnalysisId: string;
}) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "edit");
  const [customer, riskAnalysis] = await Promise.all([
    findCustomerForRisk(context.company.id, input.customerId),
    findRiskAnalysisForCompany(
      context.company.id,
      input.customerId,
      input.riskAnalysisId,
    ),
  ]);

  if (!customer || !riskAnalysis) {
    return {
      ok: false as const,
      message: "A analise informada nao foi localizada.",
    };
  }

  await prisma.$transaction([
    prisma.customerRiskAnalysis.update({
      data: {
        analysisDate: new Date(),
        analysisStatus: "REOPENED",
        analystUserId: context.user.id,
      },
      where: { id: riskAnalysis.id },
    }),
    prisma.customerRiskAnalysisHistory.create({
      data: {
        approvedSalesLimit: riskAnalysis.approvedSalesLimit,
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        finalOpinion: riskAnalysis.finalOpinion,
        notes: "Analise reaberta para revisao.",
        riskAnalysisId: riskAnalysis.id,
        riskLevel: riskAnalysis.riskLevel,
        score: riskAnalysis.consolidatedScore,
        source: "MANUAL_REOPEN",
      },
    }),
    prisma.customerRiskEvent.create({
      data: {
        companyId: context.company.id,
        createdById: context.user.id,
        customerId: customer.id,
        description: "Analise reaberta para revisao.",
        eventType: "ANALYSIS_UPDATED",
        riskAnalysisId: riskAnalysis.id,
      },
    }),
  ]);

  return {
    ok: true as const,
    message: "Analise reaberta para revisao.",
    riskAnalysisId: riskAnalysis.id,
  };
}

export function getCustomerRiskRoute(customerId: string) {
  return `/crm/cliente/${customerId}/analise-risco`;
}

export { riskAnalysisStatusLabels };

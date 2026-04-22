import type {
  CustomerRiskAnalysisStatus,
  CustomerRiskEventType,
  CustomerRiskExternalSource,
  CustomerRiskFinalOpinion,
  CustomerRiskHistorySource,
  CustomerRiskLevel,
  CustomerRiskQueryStatus,
} from "@prisma/client";

export const riskLevelLabels: Record<CustomerRiskLevel, string> = {
  CRITICAL: "Critico",
  HIGH: "Alto",
  LOW: "Baixo",
  MEDIUM: "Medio",
  NOT_CLASSIFIED: "Nao classificado",
  VERY_LOW: "Muito baixo",
};

export const riskLevelOptions: Array<{
  label: string;
  value: CustomerRiskLevel;
}> = [
  { label: riskLevelLabels.NOT_CLASSIFIED, value: "NOT_CLASSIFIED" },
  { label: riskLevelLabels.VERY_LOW, value: "VERY_LOW" },
  { label: riskLevelLabels.LOW, value: "LOW" },
  { label: riskLevelLabels.MEDIUM, value: "MEDIUM" },
  { label: riskLevelLabels.HIGH, value: "HIGH" },
  { label: riskLevelLabels.CRITICAL, value: "CRITICAL" },
];

export const riskLevelTones: Record<
  CustomerRiskLevel,
  "error" | "info" | "success" | "warning"
> = {
  CRITICAL: "error",
  HIGH: "warning",
  LOW: "success",
  MEDIUM: "info",
  NOT_CLASSIFIED: "info",
  VERY_LOW: "success",
};

export const riskAnalysisStatusLabels: Record<CustomerRiskAnalysisStatus, string> = {
  COMPLETED: "Concluida",
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisao",
  REOPENED: "Reaberta",
};

export const riskAnalysisStatusOptions: Array<{
  label: string;
  value: CustomerRiskAnalysisStatus;
}> = [
  { label: riskAnalysisStatusLabels.DRAFT, value: "DRAFT" },
  { label: riskAnalysisStatusLabels.IN_REVIEW, value: "IN_REVIEW" },
  { label: riskAnalysisStatusLabels.COMPLETED, value: "COMPLETED" },
  { label: riskAnalysisStatusLabels.REOPENED, value: "REOPENED" },
];

export const riskAnalysisStatusTones: Record<
  CustomerRiskAnalysisStatus,
  "error" | "info" | "success" | "warning"
> = {
  COMPLETED: "success",
  DRAFT: "info",
  IN_REVIEW: "warning",
  REOPENED: "warning",
};

export const riskFinalOpinionLabels: Record<CustomerRiskFinalOpinion, string> = {
  APPROVED_REDUCED_LIMIT: "Aprovado com limite reduzido",
  APPROVED_WITHOUT_RESTRICTIONS: "Aprovado sem restricoes",
  APPROVED_WITH_RESTRICTIONS: "Aprovado com restricoes",
  REJECTED: "Reprovado",
};

export const riskFinalOpinionOptions: Array<{
  label: string;
  value: CustomerRiskFinalOpinion;
}> = [
  {
    label: riskFinalOpinionLabels.APPROVED_WITHOUT_RESTRICTIONS,
    value: "APPROVED_WITHOUT_RESTRICTIONS",
  },
  {
    label: riskFinalOpinionLabels.APPROVED_WITH_RESTRICTIONS,
    value: "APPROVED_WITH_RESTRICTIONS",
  },
  {
    label: riskFinalOpinionLabels.APPROVED_REDUCED_LIMIT,
    value: "APPROVED_REDUCED_LIMIT",
  },
  { label: riskFinalOpinionLabels.REJECTED, value: "REJECTED" },
];

export const riskHistorySourceLabels: Record<CustomerRiskHistorySource, string> = {
  EXTERNAL_QUERY: "Consulta externa",
  INTERNAL_REVIEW: "Analise interna",
  MANUAL_REOPEN: "Revisao manual",
  SYSTEM: "Sistema",
};

export const riskExternalSourceLabels: Record<CustomerRiskExternalSource, string> = {
  CENTRAL_BANK: "Banco Central",
  SERASA: "Serasa",
};

export const riskQueryStatusLabels: Record<CustomerRiskQueryStatus, string> = {
  COMPLETED: "Concluida",
  FAILED: "Falhou",
  NOT_ENABLED: "Integracao nao habilitada",
  PENDING: "Pendente",
};

export const riskEventTypeLabels: Record<CustomerRiskEventType, string> = {
  ANALYSIS_STARTED: "Analise iniciada",
  ANALYSIS_UPDATED: "Analise atualizada",
  EXTERNAL_RESTRICTION: "Restricao externa",
  LIMIT_CHANGED: "Limite alterado",
  MANUAL_NOTE: "Nota manual",
  PAYMENT_DELAY: "Atraso de pagamento",
};

export const riskBooleanOptions = [
  { label: "Nao", value: "false" },
  { label: "Sim", value: "true" },
] as const;

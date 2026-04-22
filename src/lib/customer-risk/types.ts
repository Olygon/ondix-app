import type {
  CustomerRiskAnalysisStatus,
  CustomerRiskExternalSource,
  CustomerRiskFinalOpinion,
  CustomerRiskLevel,
} from "@prisma/client";

import type { PermissionAccessState } from "@/lib/access-control/permissions";
import type { CustomerType } from "@prisma/client";

export type RiskSummary = {
  analystName: string;
  analysisDate: string;
  analysisStatus: CustomerRiskAnalysisStatus | null;
  approvedSalesLimit: string;
  consolidatedScore: string;
  recommendedSalesLimit: string;
  riskLevel: CustomerRiskLevel;
};

export type RiskBaseData = {
  averageRevenue: string;
  customerDocument: string;
  customerName: string;
  customerType: CustomerType;
  defaultHistory: string;
  lateEventCount: string;
  longestDelay: string;
  openAmount: string;
  overdueAmount: string;
  overdueTitlesCount: string;
  relationshipTime: string;
  receivedAmount: string;
};

export type RiskAnalysisFormValues = {
  activeContractScore: string;
  allowsInstallments: boolean;
  analysisStatus: CustomerRiskAnalysisStatus;
  approvedSalesLimit: string;
  commercialDependencyScore: string;
  consolidatedScore: string;
  defaultFrequencyScore: string;
  externalRestrictionScore: string;
  externalScore: string;
  externalScoreCriterion: string;
  finalOpinion: CustomerRiskFinalOpinion | "";
  financialVolumeScore: string;
  internalScore: string;
  latePaymentHistoryScore: string;
  manualAnalystRating: string;
  maxTermDays: string;
  notes: string;
  recommendedSalesLimit: string;
  relationshipTimeScore: string;
  requiresAdditionalGuarantee: boolean;
  requiresDownPayment: boolean;
  requiresFormalContract: boolean;
  riskConcentrationScore: string;
  riskLevel: CustomerRiskLevel;
};

export type RiskAnalysisHistoryRow = {
  approvedSalesLimit: string;
  createdAt: string;
  createdByName: string;
  finalOpinion: string;
  id: string;
  notes: string;
  riskLevel: CustomerRiskLevel;
  score: string;
  source: string;
};

export type RiskEventRow = {
  createdAt: string;
  createdByName: string;
  description: string;
  eventType: string;
  id: string;
  notes: string;
  scoreImpact: string;
};

export type RiskExternalQueryView = {
  centralBankConsulted: boolean;
  centralBankLastQueryDate: string;
  centralBankSummary: string;
  consolidatedExternalScore: string;
  integrationStatus: string;
  queryRows: Array<{
    createdAt: string;
    id: string;
    requestedByName: string;
    sourceType: CustomerRiskExternalSource;
    status: string;
    summaryResult: string;
  }>;
  serasaConsulted: boolean;
  serasaLastQueryDate: string;
  serasaSummary: string;
};

export type CustomerRiskAnalysisPageData = {
  access: {
    customers: PermissionAccessState;
  };
  baseData: RiskBaseData;
  companyName: string;
  customer: {
    code: string;
    document: string;
    id: string;
    name: string;
    type: CustomerType;
  };
  events: RiskEventRow[];
  externalQuery: RiskExternalQueryView;
  hasAnalysis: boolean;
  histories: RiskAnalysisHistoryRow[];
  riskAnalysis: (RiskAnalysisFormValues & {
    id: string;
  }) | null;
  summary: RiskSummary;
};

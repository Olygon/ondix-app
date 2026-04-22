"use server";

import { revalidatePath } from "next/cache";
import type { CustomerRiskExternalSource } from "@prisma/client";

import {
  initialRiskActionState,
  type RiskActionState,
} from "@/lib/customer-risk/form-state";
import {
  createExternalRiskQueryPlaceholder,
  getCustomerRiskRoute,
  reopenCustomerRiskAnalysis,
  saveCustomerRiskAnalysis,
  startCustomerRiskAnalysis,
} from "@/lib/customer-risk/service";
import {
  getFieldErrors,
  riskAnalysisSchema,
} from "@/lib/customer-risk/validators";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getBooleanSelectValue(formData: FormData, key: string) {
  return getFormValue(formData, key) === "true";
}

function revalidateRiskPaths(customerId: string) {
  revalidatePath("/crm/cliente");
  revalidatePath(`/crm/cliente/${customerId}`);
  revalidatePath(getCustomerRiskRoute(customerId));
}

export async function startCustomerRiskAnalysisAction(
  previousState: RiskActionState = initialRiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para iniciar a analise.",
      status: "error",
    };
  }

  const result = await startCustomerRiskAnalysis(customerId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidateRiskPaths(customerId);

  return {
    message: result.message,
    riskAnalysisId: result.riskAnalysisId,
    status: "success",
  };
}

export async function saveCustomerRiskAnalysisAction(
  previousState: RiskActionState = initialRiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const riskAnalysisId = getFormValue(formData, "riskAnalysisId");
  const parsedData = riskAnalysisSchema.safeParse({
    activeContractScore: getFormValue(formData, "activeContractScore"),
    allowsInstallments: getBooleanSelectValue(formData, "allowsInstallments"),
    analysisStatus: getFormValue(formData, "analysisStatus"),
    approvedSalesLimit: getFormValue(formData, "approvedSalesLimit"),
    commercialDependencyScore: getFormValue(formData, "commercialDependencyScore"),
    defaultFrequencyScore: getFormValue(formData, "defaultFrequencyScore"),
    externalRestrictionScore: getFormValue(formData, "externalRestrictionScore"),
    externalScoreCriterion: getFormValue(formData, "externalScoreCriterion"),
    finalOpinion: getFormValue(formData, "finalOpinion"),
    financialVolumeScore: getFormValue(formData, "financialVolumeScore"),
    internalScore: getFormValue(formData, "internalScore"),
    latePaymentHistoryScore: getFormValue(formData, "latePaymentHistoryScore"),
    manualAnalystRating: getFormValue(formData, "manualAnalystRating"),
    maxTermDays: getFormValue(formData, "maxTermDays"),
    notes: getFormValue(formData, "notes"),
    recommendedSalesLimit: getFormValue(formData, "recommendedSalesLimit"),
    relationshipTimeScore: getFormValue(formData, "relationshipTimeScore"),
    requiresAdditionalGuarantee: getBooleanSelectValue(
      formData,
      "requiresAdditionalGuarantee",
    ),
    requiresDownPayment: getBooleanSelectValue(formData, "requiresDownPayment"),
    requiresFormalContract: getBooleanSelectValue(formData, "requiresFormalContract"),
    riskConcentrationScore: getFormValue(formData, "riskConcentrationScore"),
    riskLevel: getFormValue(formData, "riskLevel"),
  });

  if (!customerId || !riskAnalysisId) {
    return {
      message: "A analise de risco nao foi localizada para salvar.",
      status: "error",
    };
  }

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os campos da analise antes de salvar.",
      status: "error",
    };
  }

  const result = await saveCustomerRiskAnalysis({
    ...parsedData.data,
    analysisStatus: parsedData.data.analysisStatus as Parameters<
      typeof saveCustomerRiskAnalysis
    >[0]["analysisStatus"],
    customerId,
    finalOpinion: parsedData.data.finalOpinion as Parameters<
      typeof saveCustomerRiskAnalysis
    >[0]["finalOpinion"],
    riskAnalysisId,
    riskLevel: parsedData.data.riskLevel as Parameters<
      typeof saveCustomerRiskAnalysis
    >[0]["riskLevel"],
  });

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidateRiskPaths(customerId);

  return {
    message: result.message,
    riskAnalysisId: result.riskAnalysisId,
    status: "success",
  };
}

export async function externalRiskQueryPlaceholderAction(
  previousState: RiskActionState = initialRiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const riskAnalysisId = getFormValue(formData, "riskAnalysisId");
  const sourceType = getFormValue(formData, "sourceType") as CustomerRiskExternalSource;

  if (!customerId || !riskAnalysisId || !sourceType) {
    return {
      message: "Inicie a analise antes de consultar fontes externas.",
      status: "error",
    };
  }

  const result = await createExternalRiskQueryPlaceholder({
    customerId,
    riskAnalysisId,
    sourceType,
  });

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidateRiskPaths(customerId);

  return {
    message: result.message,
    riskAnalysisId: result.riskAnalysisId,
    status: "success",
  };
}

export async function reopenCustomerRiskAnalysisAction(
  previousState: RiskActionState = initialRiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const riskAnalysisId = getFormValue(formData, "riskAnalysisId");

  if (!customerId || !riskAnalysisId) {
    return {
      message: "A analise de risco nao foi localizada para reabrir.",
      status: "error",
    };
  }

  const result = await reopenCustomerRiskAnalysis({
    customerId,
    riskAnalysisId,
  });

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidateRiskPaths(customerId);

  return {
    message: result.message,
    riskAnalysisId: result.riskAnalysisId,
    status: "success",
  };
}

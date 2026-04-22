import { z } from "zod";

import {
  riskAnalysisStatusOptions,
  riskFinalOpinionOptions,
  riskLevelOptions,
} from "@/lib/customer-risk/constants";

const riskLevelValues = riskLevelOptions.map((item) => item.value);
const riskAnalysisStatusValues = riskAnalysisStatusOptions.map((item) => item.value);
const riskFinalOpinionValues = riskFinalOpinionOptions.map((item) => item.value);

const optionalText = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

const optionalScore = z
  .string()
  .trim()
  .refine((value) => !value || Number(value) >= 0, "Informe um valor positivo.")
  .refine((value) => !value || Number(value) <= 1000, "Use score de 0 a 1000.")
  .optional()
  .or(z.literal(""));

const optionalDays = z
  .string()
  .trim()
  .refine((value) => !value || Number.isInteger(Number(value)), "Informe dias inteiros.")
  .refine((value) => !value || Number(value) >= 0, "Informe um prazo positivo.")
  .optional()
  .or(z.literal(""));

const optionalMoney = z
  .string()
  .trim()
  .refine((value) => !value || !Number.isNaN(Number(value)), "Informe um valor valido.")
  .optional()
  .or(z.literal(""));

export const riskAnalysisSchema = z.object({
  activeContractScore: optionalScore,
  allowsInstallments: z.boolean(),
  analysisStatus: z.enum(riskAnalysisStatusValues as [string, ...string[]]),
  approvedSalesLimit: optionalMoney,
  commercialDependencyScore: optionalScore,
  defaultFrequencyScore: optionalScore,
  externalRestrictionScore: optionalScore,
  externalScoreCriterion: optionalScore,
  finalOpinion: z
    .enum(riskFinalOpinionValues as [string, ...string[]])
    .optional()
    .or(z.literal("")),
  financialVolumeScore: optionalScore,
  internalScore: optionalScore,
  latePaymentHistoryScore: optionalScore,
  manualAnalystRating: optionalText,
  maxTermDays: optionalDays,
  notes: optionalText,
  recommendedSalesLimit: optionalMoney,
  relationshipTimeScore: optionalScore,
  requiresAdditionalGuarantee: z.boolean(),
  requiresDownPayment: z.boolean(),
  requiresFormalContract: z.boolean(),
  riskConcentrationScore: optionalScore,
  riskLevel: z.enum(riskLevelValues as [string, ...string[]]),
});

export function getFieldErrors(error: z.ZodError) {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened).map(([fieldName, fieldErrors]) => [
      fieldName,
      Array.isArray(fieldErrors) ? fieldErrors.filter(Boolean) : undefined,
    ]),
  );
}

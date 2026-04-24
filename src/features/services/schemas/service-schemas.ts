import { z } from "zod";

import {
  entityStatusOptions,
  providedServiceStatusOptions,
} from "@/features/services/constants/service-constants";

const entityStatusValues = entityStatusOptions.map((item) => item.value);
const serviceStatusValues = providedServiceStatusOptions.map((item) => item.value);

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

function normalizeDecimalInput(value: string) {
  return value.trim().replace(/\./g, "").replace(",", ".");
}

function isDecimalInput(value: string, allowEmpty = true) {
  const normalized = normalizeDecimalInput(value);

  if (!normalized) {
    return allowEmpty;
  }

  return /^\d+(\.\d{1,4})?$/.test(normalized) && Number.isFinite(Number(normalized));
}

const moneyInput = z
  .string()
  .trim()
  .refine((value) => isDecimalInput(value), "Informe um valor numerico valido.");

const percentInput = z
  .string()
  .trim()
  .refine((value) => isDecimalInput(value), "Informe um percentual valido.")
  .refine((value) => Number(normalizeDecimalInput(value) || "0") <= 1000, {
    message: "Informe um percentual menor ou igual a 1000.",
  });

export const providedServiceSchema = z.object({
  administrativeCostPercent: percentInput,
  commissionPercent: percentInput,
  costAmount: moneyInput,
  description: z.string().trim().min(1, "Informe a descricao do servico."),
  name: z.string().trim().min(1, "Informe o nome do servico."),
  priceAmount: moneyInput,
  profitMarginPercent: percentInput,
  serviceLaw116Id: z.string().trim().min(1, "Selecione o codigo da Lei 116/03."),
  serviceNbsId: z.string().trim().min(1, "Selecione o codigo NBS."),
  status: z.enum(serviceStatusValues as [string, ...string[]]),
  taxCbsPercent: percentInput,
  taxCidPercent: percentInput,
  taxCofinsPercent: percentInput,
  taxCsllPercent: percentInput,
  taxIbsPercent: percentInput,
  taxIcmsPercent: percentInput,
  taxIpiPercent: percentInput,
  taxIrpjPercent: percentInput,
  taxPisPercent: percentInput,
  taxSimpleNationalPercent: percentInput,
});

export const serviceMunicipalTaxRuleSchema = z.object({
  isDefault: z.boolean(),
  issRate: percentInput,
  municipalTaxCodeId: z.string().trim().min(1, "Selecione o cTribMun."),
  municipalityIbgeCode: z
    .string()
    .trim()
    .regex(/^\d{7}$/, "Informe um codigo do municipio com 7 digitos."),
  notes: optionalTrimmedString,
});

export const serviceLaw116Schema = z.object({
  category: optionalTrimmedString,
  code: z.string().trim().min(1, "Informe o cTribNac."),
  description: z.string().trim().min(1, "Informe a descricao."),
  requiresConstruction: z.boolean(),
  requiresEvent: z.boolean(),
  requiresProperty: z.boolean(),
  status: z.enum(entityStatusValues as [string, ...string[]]),
});

export const serviceNbsSchema = z.object({
  category: optionalTrimmedString,
  code: z.string().trim().min(1, "Informe o codigo NBS."),
  description: z.string().trim().min(1, "Informe a descricao."),
  status: z.enum(entityStatusValues as [string, ...string[]]),
});

export const municipalTaxCodeSchema = z.object({
  code: z.string().trim().min(1, "Informe o cTribMun."),
  defaultIssRate: percentInput,
  description: z.string().trim().min(1, "Informe a descricao."),
  municipalityIbgeCode: z
    .string()
    .trim()
    .regex(/^\d{7}$/, "Informe um codigo do municipio com 7 digitos."),
  municipalityName: z.string().trim().min(1, "Informe o nome do municipio."),
  stateCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Informe a UF com 2 letras."),
  status: z.enum(entityStatusValues as [string, ...string[]]),
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

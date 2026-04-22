import { z } from "zod";

import {
  commercialProposalEditableStatusOptions,
  commercialProposalPaymentMethodOptions,
} from "@/lib/commercial-proposals/constants";

const editableStatusValues = commercialProposalEditableStatusOptions.map(
  (item) => item.value,
);
const paymentMethodValues = commercialProposalPaymentMethodOptions.map(
  (item) => item.value,
);

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

const quantityInput = z
  .string()
  .trim()
  .refine((value) => isDecimalInput(value, false), "Informe uma quantidade valida.")
  .refine((value) => Number(normalizeDecimalInput(value)) > 0, {
    message: "A quantidade deve ser maior que zero.",
  });

const percentInput = z
  .string()
  .trim()
  .refine((value) => isDecimalInput(value), "Informe um percentual valido.")
  .refine((value) => Number(normalizeDecimalInput(value) || "0") <= 100, {
    message: "Informe um percentual menor ou igual a 100.",
  });

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

export const commercialProposalItemSchema = z.object({
  id: z.string().nullable().optional(),
  lineDiscountAmount: moneyInput,
  lineDiscountPercent: percentInput,
  quantity: quantityInput,
  serviceCodeSnapshot: z.string().trim().min(1, "Informe o codigo do servico."),
  serviceDescriptionSnapshot: z
    .string()
    .trim()
    .min(1, "Informe a descricao do servico."),
  serviceId: z.string().trim().min(1, "Selecione um servico."),
  serviceNameSnapshot: z.string().trim().min(1, "Selecione um servico."),
  sortOrder: z.coerce.number().int().min(0).optional(),
  unitPriceAmount: moneyInput,
});

export const commercialProposalSchema = z.object({
  customerId: z.string().trim().min(1, "Selecione o cliente."),
  deliveryCostAmount: moneyInput,
  deliveryDeadline: optionalTrimmedString,
  downPaymentAmount: moneyInput,
  globalDiscountAmount: moneyInput,
  issueDate: z.iso.date("Informe a data de criacao."),
  items: z
    .array(commercialProposalItemSchema)
    .min(1, "Inclua pelo menos um item na proposta."),
  materialCostAmount: moneyInput,
  notes: optionalTrimmedString,
  otherCostAmount: moneyInput,
  paymentMethod: z.enum(paymentMethodValues as [string, ...string[]]),
  status: z.enum(editableStatusValues as [string, ...string[]]),
  validUntil: z.iso.date("Informe a data de validade."),
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

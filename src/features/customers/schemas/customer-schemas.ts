import { z } from "zod";

import {
  customerStatusOptions,
  customerTypeOptions,
} from "@/features/customers/constants/customer-constants";
import {
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from "@/lib/formatters/brazil";

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

const customerStatusValues = customerStatusOptions.map((item) => item.value);
const customerTypeValues = customerTypeOptions.map((item) => item.value);

function isValidEmail(value?: string) {
  if (!value) {
    return true;
  }

  return z.email().safeParse(value).success;
}

export const customerSchema = z
  .object({
    addressComplement: optionalTrimmedString,
    city: optionalTrimmedString,
    cityDocument: optionalTrimmedString,
    email: optionalTrimmedString.refine(
      (value) => isValidEmail(value),
      "Informe um e-mail valido.",
    ),
    federalDocument: z.string().trim().min(1, "Informe o CPF ou CNPJ."),
    name: z.string().trim().min(1, "Informe o nome do cliente."),
    neighborhood: optionalTrimmedString,
    phone: optionalTrimmedString.refine(
      (value) => !value || onlyDigits(value).length === 11,
      "Informe um telefone com DDD e 9 digitos.",
    ),
    postalCode: optionalTrimmedString.refine(
      (value) => !value || onlyDigits(value).length === 8,
      "Informe um CEP valido.",
    ),
    stateCode: optionalTrimmedString.refine(
      (value) => !value || /^[A-Z]{2}$/.test(value),
      "Selecione uma UF valida.",
    ),
    stateDocument: optionalTrimmedString,
    status: z.enum(customerStatusValues as [string, ...string[]]),
    street: optionalTrimmedString,
    streetNumber: optionalTrimmedString,
    type: z.enum(customerTypeValues as [string, ...string[]]),
    whatsapp: optionalTrimmedString.refine(
      (value) => !value || onlyDigits(value).length === 11,
      "Informe um WhatsApp com DDD e 9 digitos.",
    ),
    whatsappReminderEnabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const documentDigits = onlyDigits(data.federalDocument);

    if (data.type === "INDIVIDUAL" && !isValidCpf(documentDigits)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um CPF valido.",
        path: ["federalDocument"],
      });
    }

    if (data.type === "COMPANY" && !isValidCnpj(documentDigits)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um CNPJ valido.",
        path: ["federalDocument"],
      });
    }
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

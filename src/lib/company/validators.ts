import { z } from "zod";

import { isValidCnpj, onlyDigits } from "@/lib/company/formatters";

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

export const subscriberCompanySchema = z.object({
  addressComplement: optionalTrimmedString,
  city: z.string().trim().min(1, "Informe a cidade."),
  companyEmail: z.email("Informe um e-mail valido."),
  companyPhone: optionalTrimmedString.refine(
    (value) => !value || onlyDigits(value).length === 11,
    "Informe um telefone com DDD e 9 digitos.",
  ),
  district: z.string().trim().min(1, "Informe o bairro."),
  digitalCertificatePassword: optionalTrimmedString,
  legalName: z.string().trim().min(1, "Informe a razao social."),
  managingPartnerName: optionalTrimmedString,
  municipalRegistration: optionalTrimmedString,
  postalCode: z
    .string()
    .trim()
    .min(1, "Informe o CEP.")
    .refine((value) => onlyDigits(value).length === 8, "Informe um CEP valido."),
  primaryCnae: z.string().trim().min(1, "Informe o CNAE primario."),
  responsibleAdminEmail: z.email("Informe um e-mail valido para o administrador."),
  responsibleAdminName: z.string().trim().min(1, "Informe o nome do administrador."),
  responsibleAdminPhone: z
    .string()
    .trim()
    .refine(
      (value) => onlyDigits(value).length === 11,
      "Informe um WhatsApp com DDD e 9 digitos.",
    ),
  responsibleAdminUserId: z
    .string()
    .trim()
    .min(1, "Selecione um administrador responsavel."),
  secondaryCnae: optionalTrimmedString,
  shortName: z.string().trim().min(1, "Informe o nome curto."),
  stateCode: z
    .string()
    .trim()
    .length(2, "Selecione a UF."),
  stateRegistration: optionalTrimmedString,
  street: z.string().trim().min(1, "Informe o logradouro."),
  streetNumber: z.string().trim().min(1, "Informe o numero."),
  taxId: z
    .string()
    .trim()
    .min(1, "Informe o CNPJ.")
    .refine((value) => isValidCnpj(value), "Informe um CNPJ valido."),
});

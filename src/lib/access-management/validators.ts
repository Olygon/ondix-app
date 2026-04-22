import { z } from "zod";

import { onlyDigits } from "@/lib/company/formatters";
import {
  accessProfileTierOptions,
  profileStatusOptions,
  userStatusOptions,
} from "@/lib/access-management/constants";

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

const userStatusValues = userStatusOptions.map((item) => item.value);
const accessProfileTierValues = accessProfileTierOptions.map((item) => item.value);
const profileStatusValues = profileStatusOptions.map((item) => item.value);

export const userAccountSchema = z.object({
  accessProfileId: z.string().trim().min(1, "Selecione um perfil de acesso."),
  department: optionalTrimmedString,
  email: z.email("Informe um e-mail valido."),
  fullName: z.string().trim().min(1, "Informe o nome completo."),
  jobTitle: optionalTrimmedString,
  phone: optionalTrimmedString.refine(
    (value) => !value || onlyDigits(value).length === 11,
    "Informe um telefone com DDD e 9 digitos.",
  ),
  shortName: z.string().trim().min(1, "Informe o nome curto."),
  status: z.enum(userStatusValues as [string, ...string[]]),
});

const permissionRowSchema = z.object({
  canCreate: z.boolean(),
  canDelete: z.boolean(),
  canEdit: z.boolean(),
  canView: z.boolean(),
  code: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

export const accessProfileSchema = z.object({
  description: optionalTrimmedString,
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do perfil.")
    .max(20, "Use no maximo 20 caracteres no nome do perfil."),
  permissionsJson: z
    .string()
    .trim()
    .min(2, "Atualize a matriz de permissoes antes de salvar.")
    .transform((value, ctx) => {
      try {
        const parsed = JSON.parse(value);
        return z.array(permissionRowSchema).parse(parsed);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Nao foi possivel interpretar a matriz de permissoes.",
        });
        return z.NEVER;
      }
    }),
  status: z.enum(profileStatusValues as [string, ...string[]]),
  tier: z.enum(accessProfileTierValues as [string, ...string[]]),
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

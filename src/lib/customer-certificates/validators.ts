import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .or(z.literal(""));

const optionalDateString = optionalTrimmedString.refine((value) => {
  if (!value) {
    return true;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}, "Informe uma data valida.");

export const customerCertificateManualSchema = z.object({
  certificateId: z.string().trim().min(1, "Selecione uma certidao valida."),
  certificateType: optionalTrimmedString,
  detectedSituation: z.enum([
    "UNKNOWN",
    "NEGATIVE",
    "POSITIVE",
    "POSITIVE_WITH_NEGATIVE_EFFECTS",
  ]),
  expirationDate: optionalDateString,
  issueDate: optionalDateString,
  issuingAgency: optionalTrimmedString,
  notes: optionalTrimmedString,
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

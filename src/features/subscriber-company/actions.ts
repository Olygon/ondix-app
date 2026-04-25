"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getFieldErrors } from "@/lib/auth/validators";
import {
  initialSubscriberCompanyActionState,
  type SubscriberCompanyActionState,
} from "@/features/subscriber-company/types/subscriber-company-form-state";
import { saveSubscriberCompanyProfile, cancelActiveCompanySubscription } from "@/lib/company/service";
import { subscriberCompanySchema } from "@/features/subscriber-company/schemas/subscriber-company-schemas";
import { getBooleanValue, getFormFile, getFormValue } from "@/lib/helpers/form-data";

export async function saveSubscriberCompanyAction(
  previousState: SubscriberCompanyActionState = initialSubscriberCompanyActionState,
  formData: FormData,
): Promise<SubscriberCompanyActionState> {
  void previousState;

  const parsedData = subscriberCompanySchema.safeParse({
    addressComplement: getFormValue(formData, "addressComplement"),
    city: getFormValue(formData, "city"),
    companyEmail: getFormValue(formData, "companyEmail"),
    companyPhone: getFormValue(formData, "companyPhone"),
    digitalCertificatePassword: getFormValue(
      formData,
      "digitalCertificatePassword",
    ),
    district: getFormValue(formData, "district"),
    legalName: getFormValue(formData, "legalName"),
    managingPartnerName: getFormValue(formData, "managingPartnerName"),
    municipalRegistration: getFormValue(formData, "municipalRegistration"),
    postalCode: getFormValue(formData, "postalCode"),
    primaryCnae: getFormValue(formData, "primaryCnae"),
    responsibleAdminEmail: getFormValue(formData, "responsibleAdminEmail"),
    responsibleAdminName: getFormValue(formData, "responsibleAdminName"),
    responsibleAdminPhone: getFormValue(formData, "responsibleAdminPhone"),
    responsibleAdminUserId: getFormValue(formData, "responsibleAdminUserId"),
    secondaryCnae: getFormValue(formData, "secondaryCnae"),
    shortName: getFormValue(formData, "shortName"),
    stateCode: getFormValue(formData, "stateCode"),
    stateRegistration: getFormValue(formData, "stateRegistration"),
    street: getFormValue(formData, "street"),
    streetNumber: getFormValue(formData, "streetNumber"),
    taxId: getFormValue(formData, "taxId"),
  });

  if (!parsedData.success) {
    return {
      status: "error",
      message: "Revise os campos obrigatorios antes de salvar o cadastro.",
      fieldErrors: getFieldErrors(parsedData.error),
    };
  }

  const result = await saveSubscriberCompanyProfile({
    ...parsedData.data,
    digitalCertificateFile: getFormFile(formData, "digitalCertificateFile"),
    logoFile: getFormFile(formData, "logoFile"),
    removeLogo: getBooleanValue(formData, "removeLogo"),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    status: "success",
    message: result.message,
  };
}

export async function cancelSubscriptionAction() {
  await cancelActiveCompanySubscription();
  revalidatePath("/assinante");
  revalidatePath("/assinante/gestao-assinatura");
  redirect("/assinante/gestao-assinatura");
}

"use server";

import { revalidatePath } from "next/cache";

import {
  initialCustomerCertificateActionState,
  type CustomerCertificateActionState,
} from "@/lib/customer-certificates/form-state";
import {
  deleteCustomerCertificate,
  generateCustomerCertificateUploadLink,
  getCustomerCertificateRoute,
  getCustomerCertificateWhatsappUrl,
  reprocessCustomerCertificate,
  reprocessCustomerCertificates,
  revokeCustomerCertificateUploadLink,
  sendCustomerCertificateUploadLinkEmail,
  updateCustomerCertificate,
  validateCustomerCertificate,
} from "@/lib/customer-certificates/service";
import {
  customerCertificateManualSchema,
  getFieldErrors,
} from "@/lib/customer-certificates/validators";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function revalidateCertificatePaths(customerId: string) {
  revalidatePath(getCustomerCertificateRoute(customerId));
  revalidatePath(`/crm/cliente/${customerId}`);
}

export async function generateCertificateUploadLinkAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para gerar o link.",
      status: "error",
    };
  }

  const result = await generateCustomerCertificateUploadLink(customerId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: "success",
    uploadLink: result.uploadLink,
  };
}

export async function revokeCertificateUploadLinkAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para revogar o link.",
      status: "error",
    };
  }

  const result = await revokeCustomerCertificateUploadLink(customerId);

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function sendCertificateUploadLinkEmailAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para enviar o link.",
      status: "error",
    };
  }

  const result = await sendCustomerCertificateUploadLinkEmail(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function prepareCertificateWhatsappAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para preparar o WhatsApp.",
      status: "error",
    };
  }

  const result = await getCustomerCertificateWhatsappUrl(customerId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  return {
    message: result.message,
    status: "success",
    whatsappUrl: result.whatsappUrl,
  };
}

export async function reprocessCertificatesAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para atualizar a analise.",
      status: "error",
    };
  }

  const result = await reprocessCustomerCertificates(customerId);

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function reprocessCertificateAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const certificateId = getFormValue(formData, "certificateId");

  if (!customerId || !certificateId) {
    return {
      message: "Selecione uma certidao valida para reprocessar.",
      status: "error",
    };
  }

  const result = await reprocessCustomerCertificate({ certificateId, customerId });

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function validateCertificateAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const certificateId = getFormValue(formData, "certificateId");

  if (!customerId || !certificateId) {
    return {
      message: "Selecione uma certidao valida para validar.",
      status: "error",
    };
  }

  const result = await validateCustomerCertificate({ certificateId, customerId });

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function updateCertificateAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const parsedData = customerCertificateManualSchema.safeParse({
    certificateId: getFormValue(formData, "certificateId"),
    certificateType: getFormValue(formData, "certificateType"),
    detectedSituation: getFormValue(formData, "detectedSituation"),
    expirationDate: getFormValue(formData, "expirationDate"),
    issueDate: getFormValue(formData, "issueDate"),
    issuingAgency: getFormValue(formData, "issuingAgency"),
    notes: getFormValue(formData, "notes"),
  });

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para ajustar a certidao.",
      status: "error",
    };
  }

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os dados da certidao antes de salvar.",
      status: "error",
    };
  }

  const result = await updateCustomerCertificate({
    ...parsedData.data,
    customerId,
    detectedSituation: parsedData.data.detectedSituation as Parameters<
      typeof updateCustomerCertificate
    >[0]["detectedSituation"],
  });

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function deleteCertificateAction(
  previousState: CustomerCertificateActionState = initialCustomerCertificateActionState,
  formData: FormData,
): Promise<CustomerCertificateActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");
  const certificateId = getFormValue(formData, "certificateId");

  if (!customerId || !certificateId) {
    return {
      message: "Selecione uma certidao valida para excluir.",
      status: "error",
    };
  }

  const result = await deleteCustomerCertificate({ certificateId, customerId });

  revalidateCertificatePaths(customerId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

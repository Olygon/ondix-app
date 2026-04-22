"use server";

import { revalidatePath } from "next/cache";

import {
  initialCustomerCollectionActionState,
  initialCustomerFormActionState,
  type CustomerCollectionActionState,
  type CustomerFormActionState,
} from "@/lib/customer/form-state";
import {
  deleteCustomer,
  saveCustomer,
} from "@/lib/customer/service";
import {
  customerSchema,
  getFieldErrors,
} from "@/lib/customer/validators";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getCheckboxValue(formData: FormData, key: string) {
  return getFormValue(formData, key) === "on";
}

export async function saveCustomerAction(
  previousState: CustomerFormActionState = initialCustomerFormActionState,
  formData: FormData,
): Promise<CustomerFormActionState> {
  void previousState;

  const parsedData = customerSchema.safeParse({
    addressComplement: getFormValue(formData, "addressComplement"),
    city: getFormValue(formData, "city"),
    cityDocument: getFormValue(formData, "cityDocument"),
    email: getFormValue(formData, "email"),
    federalDocument: getFormValue(formData, "federalDocument"),
    name: getFormValue(formData, "name"),
    neighborhood: getFormValue(formData, "neighborhood"),
    phone: getFormValue(formData, "phone"),
    postalCode: getFormValue(formData, "postalCode"),
    stateCode: getFormValue(formData, "stateCode"),
    stateDocument: getFormValue(formData, "stateDocument"),
    status: getFormValue(formData, "status"),
    street: getFormValue(formData, "street"),
    streetNumber: getFormValue(formData, "streetNumber"),
    type: getFormValue(formData, "type"),
    whatsapp: getFormValue(formData, "whatsapp"),
    whatsappReminderEnabled: getCheckboxValue(formData, "whatsappReminderEnabled"),
  });

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os campos obrigatorios antes de salvar o cliente.",
      status: "error",
    };
  }

  const result = await saveCustomer({
    ...parsedData.data,
    customerId: getFormValue(formData, "customerId") || undefined,
    status: parsedData.data.status as Parameters<typeof saveCustomer>[0]["status"],
    type: parsedData.data.type as Parameters<typeof saveCustomer>[0]["type"],
  });

  if (!result.ok) {
    return {
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      message: result.message,
      status: "error",
    };
  }

  revalidatePath("/crm/cliente");
  revalidatePath(`/crm/cliente/${result.savedCustomerId}`);

  return {
    message: result.message,
    savedCustomerId: result.savedCustomerId,
    status: "success",
  };
}

export async function deleteCustomerAction(
  previousState: CustomerCollectionActionState = initialCustomerCollectionActionState,
  formData: FormData,
): Promise<CustomerCollectionActionState> {
  void previousState;

  const customerId = getFormValue(formData, "customerId");

  if (!customerId) {
    return {
      message: "Selecione um cliente valido para continuar.",
      status: "error",
    };
  }

  const result = await deleteCustomer(customerId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidatePath("/crm/cliente");

  return {
    message: result.message,
    status: "success",
  };
}

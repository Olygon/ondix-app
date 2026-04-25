"use server";

import { revalidatePath } from "next/cache";

import {
  initialSubscriptionActionState,
  type SubscriptionActionState,
} from "@/features/subscription/types/subscription-form-state";
import {
  cancelSubscriberSubscription,
  prepareSubscriptionPayment,
} from "@/lib/subscription/service";

function getInvoiceIds(formData: FormData) {
  return formData
    .getAll("invoiceIds")
    .filter((value): value is string => typeof value === "string");
}

export async function prepareSubscriptionPaymentAction(
  previousState: SubscriptionActionState = initialSubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  void previousState;

  const result = await prepareSubscriptionPayment(getInvoiceIds(formData));

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidatePath("/assinante/gestao-assinatura");

  return {
    message: result.message,
    paymentAttemptId: result.paymentAttemptId,
    status: "success",
  };
}

export async function cancelSubscriberSubscriptionAction(
  previousState: SubscriptionActionState = initialSubscriptionActionState,
  formData?: FormData,
): Promise<SubscriptionActionState> {
  void previousState;
  void formData;

  const result = await cancelSubscriberSubscription();

  revalidatePath("/assinante");
  revalidatePath("/assinante/gestao-assinatura");

  return {
    message: result.message,
    status: "success",
  };
}

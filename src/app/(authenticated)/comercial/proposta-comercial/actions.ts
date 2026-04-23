"use server";

import { revalidatePath } from "next/cache";

import {
  initialCommercialProposalActionState,
  initialCommercialProposalCollectionActionState,
  type CommercialProposalActionState,
  type CommercialProposalCollectionActionState,
} from "@/lib/commercial-proposals/form-state";
import {
  approveCommercialProposal,
  deleteCommercialProposal,
  generateContractFromCommercialProposal,
  inactivateCommercialProposal,
  saveCommercialProposal,
  sendCommercialProposalByEmail,
} from "@/lib/commercial-proposals/service";
import {
  commercialProposalSchema,
  getFieldErrors,
} from "@/lib/commercial-proposals/validators";
import { commercialProposalBaseRoute } from "@/lib/commercial-proposals/constants";
import { getFormValue } from "@/lib/helpers/form-data";

function getItemsFromForm(formData: FormData) {
  const rawItems = getFormValue(formData, "itemsJson");

  if (!rawItems) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawItems);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function revalidateProposalPaths(proposalId?: string) {
  revalidatePath(commercialProposalBaseRoute);

  if (proposalId) {
    revalidatePath(`${commercialProposalBaseRoute}/${proposalId}`);
  }
}

export async function saveCommercialProposalAction(
  previousState: CommercialProposalActionState = initialCommercialProposalActionState,
  formData: FormData,
): Promise<CommercialProposalActionState> {
  void previousState;

  const parsedData = commercialProposalSchema.safeParse({
    customerId: getFormValue(formData, "customerId"),
    deliveryCostAmount: getFormValue(formData, "deliveryCostAmount"),
    deliveryDeadline: getFormValue(formData, "deliveryDeadline"),
    downPaymentAmount: getFormValue(formData, "downPaymentAmount"),
    globalDiscountAmount: getFormValue(formData, "globalDiscountAmount"),
    issueDate: getFormValue(formData, "issueDate"),
    items: getItemsFromForm(formData),
    materialCostAmount: getFormValue(formData, "materialCostAmount"),
    notes: getFormValue(formData, "notes"),
    otherCostAmount: getFormValue(formData, "otherCostAmount"),
    paymentMethod: getFormValue(formData, "paymentMethod"),
    status: getFormValue(formData, "status"),
    validUntil: getFormValue(formData, "validUntil"),
  });

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os campos obrigatorios antes de salvar a proposta.",
      status: "error",
    };
  }

  const result = await saveCommercialProposal({
    ...parsedData.data,
    paymentMethod: parsedData.data.paymentMethod as Parameters<
      typeof saveCommercialProposal
    >[0]["paymentMethod"],
    proposalId: getFormValue(formData, "proposalId") || undefined,
    status: parsedData.data.status as Parameters<
      typeof saveCommercialProposal
    >[0]["status"],
  });

  if (!result.ok) {
    const fieldErrors =
      "fieldErrors" in result
        ? (result.fieldErrors as CommercialProposalActionState["fieldErrors"])
        : undefined;

    return {
      fieldErrors,
      message: result.message ?? "Nao foi possivel salvar a proposta.",
      status: "error",
    };
  }

  revalidateProposalPaths(result.savedId);

  return {
    message: result.message,
    savedId: result.savedId,
    status: "success",
  };
}

export async function deleteCommercialProposalAction(
  previousState: CommercialProposalCollectionActionState =
    initialCommercialProposalCollectionActionState,
  formData: FormData,
): Promise<CommercialProposalCollectionActionState> {
  void previousState;

  const proposalId = getFormValue(formData, "proposalId");

  if (!proposalId) {
    return {
      message: "Selecione uma proposta valida para continuar.",
      status: "error",
    };
  }

  const result = await deleteCommercialProposal(proposalId);

  revalidateProposalPaths(proposalId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function inactivateCommercialProposalAction(
  previousState: CommercialProposalCollectionActionState =
    initialCommercialProposalCollectionActionState,
  formData: FormData,
): Promise<CommercialProposalCollectionActionState> {
  void previousState;

  const proposalId = getFormValue(formData, "proposalId");

  if (!proposalId) {
    return {
      message: "Selecione uma proposta valida para continuar.",
      status: "error",
    };
  }

  const result = await inactivateCommercialProposal(proposalId);

  revalidateProposalPaths(proposalId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function approveCommercialProposalAction(
  previousState: CommercialProposalCollectionActionState =
    initialCommercialProposalCollectionActionState,
  formData: FormData,
): Promise<CommercialProposalCollectionActionState> {
  void previousState;

  const proposalId = getFormValue(formData, "proposalId");

  if (!proposalId) {
    return {
      message: "Salve a proposta antes de aprovar.",
      status: "error",
    };
  }

  const result = await approveCommercialProposal(proposalId);

  revalidateProposalPaths(proposalId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function sendCommercialProposalAction(
  previousState: CommercialProposalCollectionActionState =
    initialCommercialProposalCollectionActionState,
  formData: FormData,
): Promise<CommercialProposalCollectionActionState> {
  void previousState;

  const proposalId = getFormValue(formData, "proposalId");

  if (!proposalId) {
    return {
      message: "Salve a proposta antes de enviar.",
      status: "error",
    };
  }

  const result = await sendCommercialProposalByEmail(proposalId);

  revalidateProposalPaths(proposalId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

export async function generateContractFromCommercialProposalAction(
  previousState: CommercialProposalCollectionActionState =
    initialCommercialProposalCollectionActionState,
  formData: FormData,
): Promise<CommercialProposalCollectionActionState> {
  void previousState;

  const proposalId = getFormValue(formData, "proposalId");

  if (!proposalId) {
    return {
      message: "Salve e aprove a proposta antes de gerar contrato.",
      status: "error",
    };
  }

  const result = await generateContractFromCommercialProposal(proposalId);

  revalidateProposalPaths(proposalId);

  return {
    message: result.message,
    status: result.ok ? "success" : "error",
  };
}

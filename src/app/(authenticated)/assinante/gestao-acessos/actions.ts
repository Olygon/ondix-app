"use server";

import { revalidatePath } from "next/cache";

import {
  initialAccessProfileActionState,
  initialCollectionActionState,
  initialUserAccountActionState,
  type AccessProfileActionState,
  type CollectionActionState,
  type UserAccountActionState,
} from "@/lib/access-management/form-state";
import {
  cancelManagedUser,
  deleteAccessProfile,
  saveAccessProfile,
  saveManagedUser,
} from "@/lib/access-management/service";
import {
  accessProfileSchema,
  getFieldErrors,
  userAccountSchema,
} from "@/lib/access-management/validators";
import { getBooleanValue, getFormFile, getFormValue } from "@/lib/helpers/form-data";

export async function saveManagedUserAction(
  previousState: UserAccountActionState = initialUserAccountActionState,
  formData: FormData,
): Promise<UserAccountActionState> {
  void previousState;

  const parsedData = userAccountSchema.safeParse({
    accessProfileId: getFormValue(formData, "accessProfileId"),
    department: getFormValue(formData, "department"),
    email: getFormValue(formData, "email"),
    fullName: getFormValue(formData, "fullName"),
    jobTitle: getFormValue(formData, "jobTitle"),
    phone: getFormValue(formData, "phone"),
    shortName: getFormValue(formData, "shortName"),
    status: getFormValue(formData, "status"),
  });

  if (!parsedData.success) {
    return {
      status: "error",
      message: "Revise os campos obrigatorios antes de salvar o usuario.",
      fieldErrors: getFieldErrors(parsedData.error),
      provisionalAccess: null,
    };
  }

  const result = await saveManagedUser({
    accessProfileId: parsedData.data.accessProfileId,
    department: parsedData.data.department,
    email: parsedData.data.email,
    fullName: parsedData.data.fullName,
    jobTitle: parsedData.data.jobTitle,
    photoFile: getFormFile(formData, "photoFile"),
    phone: parsedData.data.phone,
    removePhoto: getBooleanValue(formData, "removePhoto"),
    shortName: parsedData.data.shortName,
    status: parsedData.data.status as Parameters<typeof saveManagedUser>[0]["status"],
    userId: getFormValue(formData, "userId") || undefined,
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      provisionalAccess: null,
    };
  }

  revalidatePath("/assinante/gestao-acessos");
  revalidatePath("/assinante");

  if (result.createdUserId) {
    revalidatePath(`/assinante/gestao-acessos/usuarios/${result.createdUserId}`);
  }

  return {
    status: "success",
    createdUserId: result.createdUserId,
    message: result.message,
    provisionalAccess: result.provisionalAccess,
  };
}

export async function cancelManagedUserAction(
  previousState: CollectionActionState = initialCollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  void previousState;

  const userId = getFormValue(formData, "userId");

  if (!userId) {
    return {
      status: "error",
      message: "Selecione um usuario valido para continuar.",
    };
  }

  const result = await cancelManagedUser(userId);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  revalidatePath("/assinante/gestao-acessos");

  return {
    status: "success",
    message: result.message,
  };
}

export async function saveAccessProfileAction(
  previousState: AccessProfileActionState = initialAccessProfileActionState,
  formData: FormData,
): Promise<AccessProfileActionState> {
  void previousState;

  const parsedData = accessProfileSchema.safeParse({
    description: getFormValue(formData, "description"),
    name: getFormValue(formData, "name"),
    permissionsJson: getFormValue(formData, "permissionsJson"),
    status: getFormValue(formData, "status"),
    tier: getFormValue(formData, "tier"),
  });

  if (!parsedData.success) {
    return {
      status: "error",
      message: "Revise os dados do perfil antes de salvar.",
      fieldErrors: getFieldErrors(parsedData.error),
    };
  }

  const result = await saveAccessProfile({
    description: parsedData.data.description,
    name: parsedData.data.name,
    permissions: parsedData.data.permissionsJson,
    profileId: getFormValue(formData, "profileId") || undefined,
    status: parsedData.data.status as Parameters<typeof saveAccessProfile>[0]["status"],
    tier: parsedData.data.tier as Parameters<typeof saveAccessProfile>[0]["tier"],
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  revalidatePath("/assinante/gestao-acessos/perfis");

  if (result.savedProfileId) {
    revalidatePath(`/assinante/gestao-acessos/perfis/${result.savedProfileId}`);
  }

  return {
    status: "success",
    message: result.message,
    savedProfileId: result.savedProfileId,
  };
}

export async function deleteAccessProfileAction(
  previousState: CollectionActionState = initialCollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  void previousState;

  const profileId = getFormValue(formData, "profileId");

  if (!profileId) {
    return {
      status: "error",
      message: "Selecione um perfil valido para continuar.",
    };
  }

  const result = await deleteAccessProfile(profileId);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  revalidatePath("/assinante/gestao-acessos/perfis");

  return {
    status: "success",
    message: result.message,
  };
}

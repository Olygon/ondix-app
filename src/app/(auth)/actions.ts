"use server";

import { redirect } from "next/navigation";

import { initialAuthActionState, type AuthActionState } from "@/lib/auth/form-state";
import {
  createUserSession,
  destroyUserSession,
  markPostLoginContextCheck,
  requireAuthenticatedSession,
  sanitizeRedirectPath,
} from "@/lib/auth/session";
import {
  authenticateUser,
  issuePasswordReset,
  updatePasswordForAuthenticatedUser,
} from "@/lib/auth/service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  getFieldErrors,
  loginSchema,
} from "@/lib/auth/validators";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function loginAction(
  previousState: AuthActionState = initialAuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const parsedData = loginSchema.safeParse({
    email: getFormValue(formData, "email"),
    password: getFormValue(formData, "password"),
    next: getFormValue(formData, "next") || undefined,
  });

  if (!parsedData.success) {
    return {
      status: "error",
      message: "Confira os dados informados para continuar.",
      fieldErrors: getFieldErrors(parsedData.error),
    };
  }

  const result = await authenticateUser(parsedData.data.email, parsedData.data.password);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  await createUserSession(result.session);
  await markPostLoginContextCheck();

  redirect(
    result.session.mustChangePassword
      ? "/alterar-senha"
      : sanitizeRedirectPath(parsedData.data.next),
  );
}

export async function forgotPasswordAction(
  previousState: AuthActionState = initialAuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const parsedData = forgotPasswordSchema.safeParse({
    email: getFormValue(formData, "email"),
  });

  if (!parsedData.success) {
    return {
      status: "error",
      message: "Informe um e-mail valido para continuar.",
      fieldErrors: getFieldErrors(parsedData.error),
    };
  }

  const result = await issuePasswordReset(parsedData.data.email);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  return {
    status: "success",
    message: result.message,
    preview: result.preview,
  };
}

export async function changePasswordAction(
  previousState: AuthActionState = initialAuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const session = await requireAuthenticatedSession();
  const parsedData = changePasswordSchema.safeParse({
    newPassword: getFormValue(formData, "newPassword"),
    confirmPassword: getFormValue(formData, "confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });

  if (!parsedData.success) {
    return {
      status: "error",
      message: "Revise os campos antes de alterar a senha.",
      fieldErrors: getFieldErrors(parsedData.error),
    };
  }

  await updatePasswordForAuthenticatedUser(session.userId, parsedData.data.newPassword);
  await destroyUserSession();

  redirect(`/login?status=password-updated&email=${encodeURIComponent(session.email)}`);
}

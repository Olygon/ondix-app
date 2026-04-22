"use client";

import { Mail, SendHorizontal } from "lucide-react";
import { useActionState, useState } from "react";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { initialAuthActionState } from "@/lib/auth/form-state";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    initialAuthActionState,
  );
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);
  const errorKey =
    state.status === "error" && state.message ? `${state.status}:${state.message}` : null;
  const showError = Boolean(errorKey && dismissedErrorKey !== errorKey);

  return (
    <div className="space-y-6">
      {state.status === "error" && state.message && showError ? (
        <div className="space-y-3">
          <AuthMessage tone="error">{state.message}</AuthMessage>
          <button
            type="button"
            onClick={() => setDismissedErrorKey(errorKey)}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-border px-4 text-[12px] font-medium text-foreground transition-colors hover:border-primary/20 hover:bg-primary/6"
          >
            OK
          </button>
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <AuthMessage tone="success">{state.message}</AuthMessage>
      ) : null}

      {state.preview ? (
        <AuthMessage tone="info">
          <p className="font-semibold">Preview local do envio</p>
          <p className="mt-1">E-mail: {state.preview.email}</p>
          <p>Senha provisoria: {state.preview.temporaryPassword}</p>
          <p>Expira em: {state.preview.expiresAt}</p>
          <a
            href={state.preview.loginLink}
            className="mt-2 inline-flex text-primary underline underline-offset-2"
          >
            Abrir link de login
          </a>
        </AuthMessage>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground">E-mail cadastrado</span>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              className="pl-10"
            />
          </div>

          {state.fieldErrors?.email?.[0] ? (
            <span className="text-xs font-semibold text-red-600 dark:text-red-300">
              {state.fieldErrors.email[0]}
            </span>
          ) : null}
        </label>

        <AuthSubmitButton
          icon={SendHorizontal}
          pendingLabel="Verificando e-mail..."
          fullWidth={false}
          className="mt-8 w-[180px] max-w-full self-center"
        >
          Confirmar
        </AuthSubmitButton>
      </form>
    </div>
  );
}

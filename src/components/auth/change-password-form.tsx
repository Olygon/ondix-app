"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { changePasswordAction } from "@/app/(auth)/actions";
import { AuthMessage } from "@/components/feedback/auth-message";
import { PasswordField } from "@/components/auth/password-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  getPasswordStrength,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";
import { initialAuthActionState } from "@/lib/auth/form-state";
import { cn } from "@/lib/helpers/cn";

type ChangePasswordFormProps = {
  email: string;
};

const strengthStyles = {
  forte: "text-emerald-600 dark:text-emerald-300",
  fraca: "text-red-500 dark:text-red-300",
  media: "text-amber-500 dark:text-amber-300",
} as const;

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const [state, formAction] = useActionState(
    changePasswordAction,
    initialAuthActionState,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword],
  );
  const canSubmit =
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    acceptTerms;

  return (
    <div className="space-y-6">
      <AuthMessage tone="info">
        Esta alteracao sera vinculada ao e-mail <strong>{email}</strong>.
      </AuthMessage>

      {state.status === "error" && state.message ? (
        <AuthMessage tone="error">{state.message}</AuthMessage>
      ) : null}

      <form action={formAction} className="grid gap-5">
        <PasswordField
          name="newPassword"
          label="Nova senha"
          autoComplete="new-password"
          placeholder="Informe a nova senha"
          value={newPassword}
          onChange={setNewPassword}
          error={state.fieldErrors?.newPassword?.[0]}
        />

        <PasswordField
          name="confirmPassword"
          label="Confirmar a nova senha"
          autoComplete="new-password"
          placeholder="Confirme a nova senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={state.fieldErrors?.confirmPassword?.[0]}
        />

        <div className="rounded-card border border-border bg-background/60 px-4 py-3 text-xs">
          <p className="font-medium text-foreground">Validacao de senha</p>
          <p className="mt-2 text-muted-foreground">
            Minimo de {PASSWORD_MIN_LENGTH} e maximo de {PASSWORD_MAX_LENGTH} caracteres,
            com pelo menos um caractere especial.
          </p>
          <p className={cn("mt-2 font-medium capitalize", strengthStyles[passwordStrength])}>
            {passwordStrength}
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-card border border-border bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span>
            Li e aceito os termos de uso do sistema ONDIX.
          </span>
        </label>

        {state.fieldErrors?.acceptTerms?.[0] ? (
          <span className="text-xs font-semibold text-red-600 dark:text-red-300">
            {state.fieldErrors.acceptTerms[0]}
          </span>
        ) : null}

        <AuthSubmitButton
          icon={ShieldCheck}
          pendingLabel="Alterando senha..."
          disabled={!canSubmit}
          fullWidth={false}
          className="mt-8 w-[180px] max-w-full justify-self-center"
        >
          Alterar
        </AuthSubmitButton>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, LogIn, Mail } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { loginAction } from "@/app/(auth)/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { PasswordField } from "@/components/auth/password-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { initialAuthActionState } from "@/lib/auth/form-state";

export type LoginRouteMessage = {
  text: string;
  tone: "info" | "success" | "warning";
};

type LoginFormProps = {
  initialEmail?: string;
  landingPageUrl: string;
  routeMessage?: LoginRouteMessage;
  nextPath?: string;
};

export function LoginForm({
  initialEmail,
  landingPageUrl,
  routeMessage,
  nextPath,
}: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialAuthActionState);
  const [visibleRouteMessage, setVisibleRouteMessage] = useState(routeMessage);

  useEffect(() => {
    if (!routeMessage) {
      return;
    }

    const currentUrl = new URL(window.location.href);

    if (!currentUrl.searchParams.has("status")) {
      return;
    }

    currentUrl.searchParams.delete("status");
    window.history.replaceState(
      window.history.state,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
  }, [routeMessage]);

  const routeMessageToShow =
    state.status === "idle" ? visibleRouteMessage : undefined;

  return (
    <div className="mt-6">
      <span className="text-[14px] font-semibold uppercase tracking-[0.22em] text-[#FFD1BF]">
        Acesse sua conta ONDIX
      </span>
     
      <p className="mt-3 text-xs leading-5 text-sidebar-muted">
        Use o e-mail cadastrado e a senha de acesso para entrar.
      </p>

      <div className="mt-6 space-y-3">
        {routeMessageToShow ? (
          <AuthMessage tone={routeMessageToShow.tone}>
            {routeMessageToShow.text}
          </AuthMessage>
        ) : null}
        {state.status === "error" && state.message ? (
          <AuthMessage tone="error">{state.message}</AuthMessage>
        ) : null}
      </div>

      <form
        action={formAction}
        className="mt-6 flex flex-col gap-4"
        onSubmit={() => setVisibleRouteMessage(undefined)}
      >
        <input type="hidden" name="next" value={nextPath || ""} />

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-sidebar-foreground">
            E-mail de login
          </span>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={initialEmail}
              placeholder="voce@empresa.com"
              className="pl-10"
            />
          </div>

          {state.fieldErrors?.email?.[0] ? (
            <span className="text-xs font-semibold text-[#FFB4A8]">
              {state.fieldErrors.email[0]}
            </span>
          ) : null}
        </label>

        <PasswordField
          name="password"
          label="Senha de acesso"
          autoComplete="current-password"
          placeholder="Digite sua senha"
          error={state.fieldErrors?.password?.[0]}
        />

        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/recuperar-senha"
            className="text-xs font-medium text-[#FFD1BF] transition-colors hover:text-primary-foreground"
          >
            Esqueci minha senha
          </Link>
        </div>

        <AuthSubmitButton icon={LogIn} pendingLabel="Validando acesso...">
          Entrar
        </AuthSubmitButton>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-sidebar-muted">
        <span>Nao tem conta?</span>
        <a
          href={landingPageUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#F24A00] transition-colors hover:text-[#F24A00]/85"
          style={{ color: "#F24A00" }}
        >
          Saiba mais
          <ArrowRight className="h-3.5 w-3.5" style={{ color: "#F24A00" }} />
        </a>
      </div>
    </div>
  );
}

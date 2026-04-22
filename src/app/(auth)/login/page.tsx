import type { Metadata } from "next";

import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { LoginForm, type LoginRouteMessage } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Login",
};

function getLoginRouteMessage(status: string | string[] | undefined): LoginRouteMessage | undefined {
  if (typeof status !== "string") {
    return undefined;
  }

  switch (status) {
    case "password-updated":
      return {
        text: "Senha alterada com sucesso. Entre novamente com a nova credencial.",
        tone: "success",
      };
    case "subscription-canceled":
      return {
        text: "A assinatura da empresa foi cancelada e a conta foi bloqueada para acesso.",
        tone: "warning",
      };
    case "company-context-missing":
      return {
        text: "Nao foi encontrada uma empresa ativa vinculada a esta sessao.",
        tone: "warning",
      };
    default:
      return undefined;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const nextPath = typeof params.next === "string" ? params.next : "";
  const routeMessage = getLoginRouteMessage(params.status);

  return (
    <AuthSplitShell>
      <LoginForm
        initialEmail={email}
        nextPath={nextPath}
        routeMessage={routeMessage}
        landingPageUrl={process.env.LANDING_PAGE_URL || "https://ondix.com.br"}
      />
    </AuthSplitShell>
  );
}

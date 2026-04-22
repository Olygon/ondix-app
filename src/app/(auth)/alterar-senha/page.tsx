import type { Metadata } from "next";

import { AuthCenteredShell } from "@/components/auth/auth-centered-shell";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { requireAuthenticatedSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Alteracao de senha",
};

export default async function ChangePasswordPage() {
  const session = await requireAuthenticatedSession();

  return (
    <AuthCenteredShell
      title="Alteracao obrigatoria de senha"
      description="Defina a nova senha para concluir o primeiro acesso ou finalizar a recuperacao da conta."
    >
      <ChangePasswordForm email={session.email} />
    </AuthCenteredShell>
  );
}

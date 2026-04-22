import type { Metadata } from "next";

import { AuthCenteredShell } from "@/components/auth/auth-centered-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperacao de senha",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCenteredShell
      title="Recuperacao de senha"
      description="Informe o e-mail cadastrado para gerar a senha provisoria e receber as orientacoes de acesso."
    >
      <ForgotPasswordForm />
    </AuthCenteredShell>
  );
}

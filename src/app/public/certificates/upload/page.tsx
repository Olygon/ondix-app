import Image from "next/image";

import { AuthMessage } from "@/components/auth/auth-message";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPublicCertificateUploadPageData } from "@/lib/customer-certificates/service";

type PublicCertificateUploadPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const uploadFeedbackMessages: Record<string, string> = {
  "file-too-large": "O PDF deve ter no maximo 5MB.",
  "invalid-file": "Envie apenas arquivos PDF.",
  "invalid-link": "Link invalido, expirado ou sem uploads disponiveis.",
  "missing-file": "Selecione um arquivo PDF para enviar.",
  "processing-failed": "Nao foi possivel armazenar e ler o PDF enviado.",
  "upload-limit": "O limite de uploads deste link foi atingido.",
};

function getSearchValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PublicCertificateUploadPage({
  searchParams,
}: PublicCertificateUploadPageProps) {
  const params = await searchParams;
  const token = getSearchValue(params, "token");
  const status = getSearchValue(params, "status");
  const error = getSearchValue(params, "error");
  const data = await getPublicCertificateUploadPageData(token);
  const feedback =
    status === "uploaded"
      ? {
          message:
            "Arquivo recebido com sucesso. A equipe responsavel fara a validacao interna.",
          tone: "success" as const,
        }
      : error
        ? {
            message: uploadFeedbackMessages[error] ?? "Nao foi possivel enviar o PDF.",
            tone: "error" as const,
          }
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-3xl overflow-hidden">
        <div className="border-b border-border bg-sidebar px-8 py-8">
          <Image
            src="/ondix.svg"
            alt="ONDIX"
            width={148}
            height={44}
            priority
            className="h-auto w-[148px]"
          />
        </div>

        <CardHeader>
          <CardTitle>Envio de Certidao Negativa</CardTitle>
          <CardDescription>
            Selecione o PDF solicitado para concluir o envio seguro.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {feedback ? (
            <AuthMessage tone={feedback.tone}>{feedback.message}</AuthMessage>
          ) : null}

          {!data.isValid ? (
            <AuthMessage tone="error">
              {data.error ?? "Nao foi possivel validar este link de envio."}
            </AuthMessage>
          ) : (
            <>
              <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Cliente
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {data.customerName}
                </p>
              </div>

              <form
                action={`/public/certificates/upload/submit?token=${encodeURIComponent(token)}`}
                method="post"
                encType="multipart/form-data"
                className="space-y-4"
              >
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Arquivo PDF
                  </span>
                  <input
                    name="certificateFile"
                    type="file"
                    accept="application/pdf,.pdf"
                    required
                    className="h-11 rounded-[6px] border border-border bg-card px-3 py-2 text-[12px] text-foreground shadow-sm file:mr-3 file:rounded-[6px] file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-primary-foreground"
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[12px] bg-primary px-5 text-[12px] font-medium text-primary-foreground shadow-[0_28px_60px_-32px_rgba(242,74,0,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Enviar PDF
                </button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

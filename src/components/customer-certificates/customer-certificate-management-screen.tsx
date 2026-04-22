"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileSearch,
  Link2,
  Mail,
  MessageCircle,
  PencilLine,
  RefreshCw,
  RotateCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteCertificateAction,
  generateCertificateUploadLinkAction,
  prepareCertificateWhatsappAction,
  reprocessCertificateAction,
  reprocessCertificatesAction,
  revokeCertificateUploadLinkAction,
  sendCertificateUploadLinkEmailAction,
  updateCertificateAction,
  validateCertificateAction,
} from "@/app/(authenticated)/customers/[customerId]/certificates/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/list-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  certificateConfidenceLevelLabels,
  certificateProcessingStatusLabels,
  certificateUploadLinkStatusLabels,
  certificateUploadLinkStatusTones,
  customerCertificateSituationLabels,
  customerCertificateSituationTones,
  customerCertificateStatusLabels,
  customerCertificateStatusTones,
} from "@/lib/customer-certificates/constants";
import { initialCustomerCertificateActionState } from "@/lib/customer-certificates/form-state";
import type {
  CustomerCertificatePageData,
  CustomerCertificateRow,
} from "@/lib/customer-certificates/types";

const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";
const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const certificateListPageSize = 10;

type CustomerCertificateManagementScreenProps = {
  data: CustomerCertificatePageData;
};

const situationOptions = [
  "UNKNOWN",
  "NEGATIVE",
  "POSITIVE",
  "POSITIVE_WITH_NEGATIVE_EFFECTS",
] as const;

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[104px] flex-col justify-between p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-4 font-heading text-2xl font-semibold tracking-[-0.04em] text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-10 text-center">
      <FileSearch className="mx-auto h-10 w-10 text-primary/70" />
      <p className="mt-4 text-sm font-semibold text-foreground">
        Nenhuma certidao enviada.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        Gere um link externo para o cliente enviar os PDFs. A leitura inicial
        identificara tipo, orgao emissor, datas e situacao por heuristica.
      </p>
    </div>
  );
}

function HiddenCustomerFields({ customerId }: { customerId: string }) {
  return <input type="hidden" name="customerId" value={customerId} />;
}

function CertificateDetailModal({
  canEdit,
  customerId,
  certificate,
  fieldError,
  logs,
  onClose,
  updateAction,
  validateAction,
}: {
  canEdit: boolean;
  customerId: string;
  certificate: CustomerCertificateRow;
  fieldError: (name: string) => string | undefined;
  logs: CustomerCertificatePageData["logs"];
  onClose: () => void;
  updateAction: (payload: FormData) => void;
  validateAction: (payload: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[10px] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Detalhe da certidao
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold tracking-[-0.04em] text-foreground">
              {certificate.certificateType}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
            aria-label="Fechar detalhe"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Orgao", certificate.issuingAgency],
                ["Emissao", certificate.issueDate],
                ["Validade", certificate.expirationDate],
                ["Upload", certificate.uploadedAt],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[8px] border border-border bg-background/60 px-4 py-3"
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={customerCertificateSituationLabels[certificate.detectedSituation]}
                tone={customerCertificateSituationTones[certificate.detectedSituation]}
              />
              <StatusBadge
                label={customerCertificateStatusLabels[certificate.status]}
                tone={customerCertificateStatusTones[certificate.status]}
              />
            </div>

            <form action={updateAction} className="grid gap-4 md:grid-cols-2">
              <HiddenCustomerFields customerId={customerId} />
              <input type="hidden" name="certificateId" value={certificate.id} />

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Tipo</span>
                <Input
                  name="certificateType"
                  defaultValue={certificate.certificateType}
                  disabled={!canEdit}
                />
                {fieldError("certificateType") ? (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-300">
                    {fieldError("certificateType")}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Orgao emissor</span>
                <Input
                  name="issuingAgency"
                  defaultValue={certificate.issuingAgency}
                  disabled={!canEdit}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Situacao</span>
                <select
                  name="detectedSituation"
                  className={selectClassName}
                  defaultValue={certificate.detectedSituation}
                  disabled={!canEdit}
                >
                  {situationOptions.map((option) => (
                    <option key={option} value={option}>
                      {customerCertificateSituationLabels[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Emissao</span>
                <Input
                  name="issueDate"
                  type="date"
                  defaultValue={certificate.issueDateInput}
                  disabled={!canEdit}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Validade</span>
                <Input
                  name="expirationDate"
                  type="date"
                  defaultValue={certificate.expirationDateInput}
                  disabled={!canEdit}
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-xs font-medium text-foreground">Observacoes</span>
                <Textarea
                  name="notes"
                  defaultValue={certificate.notes}
                  disabled={!canEdit}
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Button icon={Save} type="submit" disabled={!canEdit}>
                  Ajustar dados
                </Button>
              </div>
            </form>

            <form action={validateAction}>
              <HiddenCustomerFields customerId={customerId} />
              <input type="hidden" name="certificateId" value={certificate.id} />
              <Button icon={CheckCircle2} type="submit" disabled={!canEdit}>
                Validar certidao
              </Button>
            </form>

            {logs.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Logs de processamento
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Data</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Status</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Tipo</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Confianca</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="text-xs text-foreground">
                          <td className="border-b border-border/60 px-3 py-3">{log.createdAt}</td>
                          <td className="border-b border-border/60 px-3 py-3">
                            {certificateProcessingStatusLabels[log.processStatus]}
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                            {log.extractedType}
                          </td>
                          <td className="border-b border-border/60 px-3 py-3">
                            {certificateConfidenceLevelLabels[log.confidenceLevel]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          <section className="min-h-[560px] overflow-hidden rounded-[8px] border border-border bg-card">
            {certificate.fileUrl ? (
              <iframe
                src={certificate.fileUrl}
                title={`Preview ${certificate.fileName}`}
                className="h-[560px] w-full"
              />
            ) : (
              <div className="flex h-[560px] items-center justify-center px-6 text-center text-xs text-muted-foreground">
                Nenhum PDF disponivel para preview.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function CustomerCertificateManagementScreen({
  data,
}: CustomerCertificateManagementScreenProps) {
  const router = useRouter();
  const [selectedCertificate, setSelectedCertificate] =
    useState<CustomerCertificateRow | null>(null);
  const [certificateListPage, setCertificateListPage] = useState(1);
  const [localMessage, setLocalMessage] = useState("");
  const [generateState, generateAction, isGenerating] = useActionState(
    generateCertificateUploadLinkAction,
    initialCustomerCertificateActionState,
  );
  const [revokeState, revokeAction, isRevoking] = useActionState(
    revokeCertificateUploadLinkAction,
    initialCustomerCertificateActionState,
  );
  const [emailState, emailAction, isSendingEmail] = useActionState(
    sendCertificateUploadLinkEmailAction,
    initialCustomerCertificateActionState,
  );
  const [whatsappState, whatsappAction, isPreparingWhatsapp] = useActionState(
    prepareCertificateWhatsappAction,
    initialCustomerCertificateActionState,
  );
  const [reprocessAllState, reprocessAllAction, isReprocessingAll] = useActionState(
    reprocessCertificatesAction,
    initialCustomerCertificateActionState,
  );
  const [reprocessState, reprocessAction, isReprocessing] = useActionState(
    reprocessCertificateAction,
    initialCustomerCertificateActionState,
  );
  const [validateState, validateAction, isValidating] = useActionState(
    validateCertificateAction,
    initialCustomerCertificateActionState,
  );
  const [updateState, updateAction, isUpdating] = useActionState(
    updateCertificateAction,
    initialCustomerCertificateActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCertificateAction,
    initialCustomerCertificateActionState,
  );
  const canEdit = data.access.customers.canEdit;
  const canDelete = data.access.customers.canDelete;
  const currentUploadUrl = generateState.uploadLink || data.uploadLink?.uploadUrl || "";
  const currentUploadStatus = generateState.uploadLink
    ? "ACTIVE"
    : data.uploadLink?.status;
  const actionMessages = [
    generateState,
    revokeState,
    emailState,
    whatsappState,
    reprocessAllState,
    reprocessState,
    validateState,
    updateState,
    deleteState,
  ].filter((state) => state.status !== "idle" && state.message);
  const selectedLogs = useMemo(
    () =>
      selectedCertificate
        ? data.logs.filter(
            (log) => log.customerCertificateId === selectedCertificate.id,
          )
        : [],
    [data.logs, selectedCertificate],
  );
  const updateFieldError = (name: string) => updateState.fieldErrors?.[name]?.[0];
  const certificateTotalPages = Math.max(
    1,
    Math.ceil(data.certificates.length / certificateListPageSize),
  );
  const currentCertificatePage = Math.min(
    certificateListPage,
    certificateTotalPages,
  );
  const paginatedCertificates = useMemo(() => {
    const startIndex = (currentCertificatePage - 1) * certificateListPageSize;

    return data.certificates.slice(startIndex, startIndex + certificateListPageSize);
  }, [currentCertificatePage, data.certificates]);

  useEffect(() => {
    if (
      generateState.status === "success" ||
      revokeState.status === "success" ||
      reprocessAllState.status === "success" ||
      reprocessState.status === "success" ||
      validateState.status === "success" ||
      updateState.status === "success" ||
      deleteState.status === "success"
    ) {
      router.refresh();
    }
  }, [
    deleteState.status,
    generateState.status,
    reprocessAllState.status,
    reprocessState.status,
    revokeState.status,
    router,
    updateState.status,
    validateState.status,
  ]);

  useEffect(() => {
    if (whatsappState.status === "success" && whatsappState.whatsappUrl) {
      window.open(whatsappState.whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }, [whatsappState.status, whatsappState.whatsappUrl]);

  async function copyUploadLink() {
    if (!currentUploadUrl) {
      setLocalMessage("Gere um link ativo antes de copiar.");
      return;
    }

    await navigator.clipboard.writeText(currentUploadUrl);
    setLocalMessage("Link copiado para a area de transferencia.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM / Comercial"
        title="Certidoes Negativas"
        description={`Gerencie certidoes negativas, links externos de envio e validacao documental de ${data.customer.name}.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push(`/crm/cliente/${data.customer.id}`)}
            >
              Voltar
            </Button>
            <form action={generateAction}>
              <HiddenCustomerFields customerId={data.customer.id} />
              <Button icon={Link2} type="submit" disabled={!canEdit || isGenerating}>
                {isGenerating ? "Gerando" : "Gerar link"}
              </Button>
            </form>
            <form action={reprocessAllAction}>
              <HiddenCustomerFields customerId={data.customer.id} />
              <Button
                icon={RefreshCw}
                type="submit"
                variant="outline"
                disabled={!canEdit || isReprocessingAll}
              >
                {isReprocessingAll ? "Atualizando" : "Atualizar analise"}
              </Button>
            </form>
          </div>
        }
      />

      {actionMessages.map((state) => (
        <AuthMessage
          key={`${state.status}-${state.message}`}
          tone={state.status === "success" ? "success" : "error"}
        >
          {state.message}
        </AuthMessage>
      ))}

      {localMessage ? <AuthMessage tone="info">{localMessage}</AuthMessage> : null}

      {!canEdit ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao de visualizacao para clientes. Links,
          validacoes e ajustes permanecem bloqueados.
        </AuthMessage>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total" value={data.summary.total} />
        <SummaryCard label="Validas" value={data.summary.valid} />
        <SummaryCard label="Vencidas" value={data.summary.expired} />
        <SummaryCard label="Positivas" value={data.summary.positive} />
        <SummaryCard label="Pendentes" value={data.summary.pending} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Link externo de upload</CardTitle>
          <CardDescription>
            O link seguro permite que o cliente envie PDFs sem login, respeitando
            validade, status e limite de uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Link atual
              </p>
              <p className="mt-2 break-all text-xs font-semibold text-foreground">
                {currentUploadUrl || "Nenhum link gerado para este cliente."}
              </p>
            </div>
            <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Status
              </p>
              <div className="mt-2">
                {currentUploadStatus ? (
                  <StatusBadge
                    label={certificateUploadLinkStatusLabels[currentUploadStatus]}
                    tone={certificateUploadLinkStatusTones[currentUploadStatus]}
                  />
                ) : (
                  <StatusBadge label="Nao gerado" tone="info" />
                )}
              </div>
            </div>
            <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Expiracao e uso
              </p>
              <p className="mt-2 text-xs font-semibold text-foreground">
                {data.uploadLink
                  ? `${data.uploadLink.expiresAt} - ${data.uploadLink.uploadsUsed}/${data.uploadLink.maxUploads}`
                  : "Sem controle ativo"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button icon={Clipboard} type="button" variant="outline" onClick={copyUploadLink}>
              Copiar link
            </Button>
            <form action={generateAction}>
              <HiddenCustomerFields customerId={data.customer.id} />
              <Button icon={Link2} type="submit" disabled={!canEdit || isGenerating}>
                Gerar novo link
              </Button>
            </form>
            <form action={revokeAction}>
              <HiddenCustomerFields customerId={data.customer.id} />
              <Button
                icon={X}
                type="submit"
                variant="outline"
                disabled={!canEdit || isRevoking}
              >
                Revogar link
              </Button>
            </form>
            <form action={emailAction}>
              <HiddenCustomerFields customerId={data.customer.id} />
              <Button
                icon={Mail}
                type="submit"
                variant="outline"
                disabled={!canEdit || isSendingEmail}
              >
                Enviar por e-mail
              </Button>
            </form>
            <form action={whatsappAction}>
              <HiddenCustomerFields customerId={data.customer.id} />
              <Button
                icon={MessageCircle}
                type="submit"
                variant="outline"
                disabled={!canEdit || isPreparingWhatsapp}
              >
                Enviar por WhatsApp
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certidoes do cliente</CardTitle>
          <CardDescription>
            Arquivos recebidos, situacao detectada, validade e acoes de revisao
            interna.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.certificates.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Tipo</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Orgao</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Situacao</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Emissao</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Validade</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Status</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Arquivo</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Upload</th>
                      <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCertificates.map((certificate) => (
                      <tr key={certificate.id} className="text-xs text-foreground">
                        <td className="border-b border-border/60 px-3 py-3 font-semibold">
                          {certificate.certificateType}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                          {certificate.issuingAgency}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3">
                          <StatusBadge
                            label={customerCertificateSituationLabels[certificate.detectedSituation]}
                            tone={customerCertificateSituationTones[certificate.detectedSituation]}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3">{certificate.issueDate}</td>
                        <td className="border-b border-border/60 px-3 py-3">{certificate.expirationDate}</td>
                        <td className="border-b border-border/60 px-3 py-3">
                          <StatusBadge
                            label={customerCertificateStatusLabels[certificate.status]}
                            tone={customerCertificateStatusTones[certificate.status]}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3">
                          {certificate.fileUrl ? (
                            <a
                              href={certificate.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-semibold text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              PDF
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                          {certificate.uploadedAt}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={actionIconClassName}
                              aria-label={`Editar certidao ${certificate.certificateType}`}
                              title="Editar certidao"
                              onClick={() => setSelectedCertificate(certificate)}
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <form action={reprocessAction}>
                              <HiddenCustomerFields customerId={data.customer.id} />
                              <input type="hidden" name="certificateId" value={certificate.id} />
                              <button
                                type="submit"
                                className={actionIconClassName}
                                aria-label={`Reprocessar certidao ${certificate.certificateType}`}
                                title="Reprocessar certidao"
                                disabled={!canEdit || isReprocessing}
                              >
                                <RotateCw className="h-4 w-4" />
                              </button>
                            </form>
                            <form
                              action={deleteAction}
                              onSubmit={(event) => {
                                if (
                                  !window.confirm(
                                    "Deseja excluir esta certidao da gestao interna?",
                                  )
                                ) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <HiddenCustomerFields customerId={data.customer.id} />
                              <input type="hidden" name="certificateId" value={certificate.id} />
                              <button
                                type="submit"
                                className={deleteActionIconClassName}
                                aria-label={`Excluir certidao ${certificate.certificateType}`}
                                title="Excluir certidao"
                                disabled={!canDelete || isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ListPagination
                page={currentCertificatePage}
                totalPages={certificateTotalPages}
                onPageChange={setCertificateListPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCertificate ? (
        <CertificateDetailModal
          canEdit={canEdit && !isUpdating && !isValidating}
          certificate={selectedCertificate}
          customerId={data.customer.id}
          fieldError={updateFieldError}
          logs={selectedLogs}
          onClose={() => setSelectedCertificate(null)}
          updateAction={updateAction}
          validateAction={validateAction}
        />
      ) : null}
    </div>
  );
}

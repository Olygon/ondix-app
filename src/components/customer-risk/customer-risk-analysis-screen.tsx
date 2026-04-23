"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSearch,
  History,
  Landmark,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  WalletCards,
} from "lucide-react";

import {
  externalRiskQueryPlaceholderAction,
  reopenCustomerRiskAnalysisAction,
  saveCustomerRiskAnalysisAction,
  startCustomerRiskAnalysisAction,
} from "@/app/(authenticated)/crm/cliente/[customerId]/analise-risco/actions";
import { AuthMessage } from "@/components/feedback/auth-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  riskAnalysisStatusLabels,
  riskAnalysisStatusOptions,
  riskAnalysisStatusTones,
  riskBooleanOptions,
  riskExternalSourceLabels,
  riskFinalOpinionOptions,
  riskLevelLabels,
  riskLevelOptions,
  riskLevelTones,
} from "@/lib/customer-risk/constants";
import { initialRiskActionState } from "@/lib/customer-risk/form-state";
import type {
  CustomerRiskAnalysisPageData,
  RiskAnalysisFormValues,
} from "@/lib/customer-risk/types";
import {
  customerTypeLabels,
} from "@/lib/customer/constants";
import { cn } from "@/lib/helpers/cn";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const textareaClassName =
  "min-h-[112px] w-full rounded-[6px] border border-border bg-card px-3 py-3 text-sm leading-5 text-foreground shadow-sm outline-none transition-colors duration-150 placeholder:text-muted-foreground/70 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const tableActionClassName =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-border bg-background/60 px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";

type CustomerRiskAnalysisScreenProps = {
  data: CustomerRiskAnalysisPageData;
};

function SummaryCard({
  description,
  icon: Icon,
  label,
  value,
}: {
  description?: string;
  icon: typeof ShieldAlert;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[120px] flex-col justify-between gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div>
          <p className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-10 text-center">
      <ShieldAlert className="h-10 w-10 text-primary/70" />
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function FieldError({
  children,
}: {
  children?: string;
}) {
  return children ? <span className={fieldMessageClassName}>{children}</span> : null;
}

function BooleanSelect({
  defaultValue,
  disabled,
  name,
}: {
  defaultValue: boolean;
  disabled?: boolean;
  name: keyof RiskAnalysisFormValues;
}) {
  return (
    <select
      name={name}
      className={selectClassName}
      defaultValue={String(defaultValue)}
      disabled={disabled}
    >
      {riskBooleanOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function CustomerRiskAnalysisScreen({
  data,
}: CustomerRiskAnalysisScreenProps) {
  const router = useRouter();
  const [startState, startAction, isStarting] = useActionState(
    startCustomerRiskAnalysisAction,
    initialRiskActionState,
  );
  const [saveState, saveAction, isSaving] = useActionState(
    saveCustomerRiskAnalysisAction,
    initialRiskActionState,
  );
  const [externalState, externalAction, isQuerying] = useActionState(
    externalRiskQueryPlaceholderAction,
    initialRiskActionState,
  );
  const [reopenState, reopenAction, isReopening] = useActionState(
    reopenCustomerRiskAnalysisAction,
    initialRiskActionState,
  );
  const [localMessage, setLocalMessage] = useState("");
  const canEdit = data.access.customers.canEdit;
  const fieldError = (name: string) => saveState.fieldErrors?.[name]?.[0];
  const riskAnalysis = data.riskAnalysis;

  useEffect(() => {
    if (
      startState.status === "success" ||
      saveState.status === "success" ||
      externalState.status === "success" ||
      reopenState.status === "success"
    ) {
      router.refresh();
    }
  }, [
    externalState.status,
    reopenState.status,
    router,
    saveState.status,
    startState.status,
  ]);

  const actionMessages = [startState, saveState, externalState, reopenState].filter(
    (state) => state.status !== "idle" && state.message,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM / Comercial"
        title="Analise de risco e score do cliente"
        description={`Avalie risco financeiro, score e limite de vendas para ${data.customer.name}.`}
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

            {riskAnalysis ? (
              <Button
                form="customer-risk-analysis-form"
                icon={Save}
                type="submit"
                disabled={!canEdit || isSaving}
              >
                {isSaving ? "Salvando" : "Salvar"}
              </Button>
            ) : null}
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
          Seu perfil possui permissao de visualizacao para clientes. A analise
          pode ser consultada, mas alteracoes ficam bloqueadas.
        </AuthMessage>
      ) : null}

      {!riskAnalysis ? (
        <Card>
          <CardContent className="space-y-5 px-6 py-6">
            <EmptyState
              title="Nenhuma analise de risco iniciada."
              description="Inicie a primeira analise para registrar score, limite recomendado, criterios objetivos, parecer financeiro e historico do cliente."
            />
            <form action={startAction} className="flex justify-center">
              <input type="hidden" name="customerId" value={data.customer.id} />
              <Button icon={Sparkles} type="submit" disabled={!canEdit || isStarting}>
                {isStarting ? "Iniciando" : "Iniciar analise"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          icon={ShieldAlert}
          label="Score do cliente"
          value={data.summary.consolidatedScore}
          description="Score consolidado sem substituir a avaliacao interna."
        />
        <Card>
          <CardContent className="flex min-h-[120px] flex-col justify-between gap-4 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Grau de risco
            </p>
            <div>
              <StatusBadge
                label={riskLevelLabels[data.summary.riskLevel]}
                tone={riskLevelTones[data.summary.riskLevel]}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Classificacao vigente da analise.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-[120px] flex-col justify-between gap-4 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Situacao da analise
            </p>
            <div>
              {data.summary.analysisStatus ? (
                <StatusBadge
                  label={riskAnalysisStatusLabels[data.summary.analysisStatus]}
                  tone={riskAnalysisStatusTones[data.summary.analysisStatus]}
                />
              ) : (
                <StatusBadge label="Sem analise" tone="info" />
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Status operacional da avaliacao.
              </p>
            </div>
          </CardContent>
        </Card>
        <SummaryCard
          icon={WalletCards}
          label="Limite recomendado"
          value={data.summary.recommendedSalesLimit}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Limite aprovado"
          value={data.summary.approvedSalesLimit}
        />
        <SummaryCard
          icon={ClipboardList}
          label="Ultima analise"
          value={data.summary.analysisDate}
          description={data.summary.analystName}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Dados base da analise</CardTitle>
          <CardDescription>
            Dados cadastrais reais e indicadores financeiros preparados para
            futura integracao com faturamento, contas a receber e contratos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Metric label="Cliente" value={data.baseData.customerName} />
          <Metric label="CNPJ/CPF" value={data.baseData.customerDocument} />
          <Metric
            label="Tipo de cliente"
            value={customerTypeLabels[data.baseData.customerType]}
          />
          <Metric label="Tempo de relacionamento" value={data.baseData.relationshipTime} />
          <Metric label="Media de faturamento" value={data.baseData.averageRevenue} />
          <Metric label="Total em aberto" value={data.baseData.openAmount} />
          <Metric label="Total vencido" value={data.baseData.overdueAmount} />
          <Metric label="Titulos vencidos" value={data.baseData.overdueTitlesCount} />
          <Metric label="Maior atraso registrado" value={data.baseData.longestDelay} />
          <Metric label="Historico de inadimplencia" value={data.baseData.defaultHistory} />
          <Metric label="Ocorrencias de atraso" value={data.baseData.lateEventCount} />
          <Metric label="Total recebido" value={data.baseData.receivedAmount} />
        </CardContent>
      </Card>

      {riskAnalysis ? (
        <form id="customer-risk-analysis-form" action={saveAction} className="space-y-6">
          <input type="hidden" name="customerId" value={data.customer.id} />
          <input type="hidden" name="riskAnalysisId" value={riskAnalysis.id} />

          <Card>
            <CardHeader>
              <CardTitle>Avaliacao interna de risco</CardTitle>
              <CardDescription>
                Score, limite, restricoes e parecer financeiro definidos pela
                analise interna da empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Score interno do cliente
                </span>
                <Input
                  name="internalScore"
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={riskAnalysis.internalScore}
                  disabled={!canEdit}
                />
                <FieldError>{fieldError("internalScore")}</FieldError>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Grau de risco interno
                </span>
                <select
                  name="riskLevel"
                  className={selectClassName}
                  defaultValue={riskAnalysis.riskLevel}
                  disabled={!canEdit}
                >
                  {riskLevelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Limite recomendado
                </span>
                <Input
                  name="recommendedSalesLimit"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={riskAnalysis.recommendedSalesLimit}
                  disabled={!canEdit}
                />
                <FieldError>{fieldError("recommendedSalesLimit")}</FieldError>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Limite de vendas autorizado
                </span>
                <Input
                  name="approvedSalesLimit"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={riskAnalysis.approvedSalesLimit}
                  disabled={!canEdit}
                />
                <FieldError>{fieldError("approvedSalesLimit")}</FieldError>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Prazo maximo recomendado
                </span>
                <Input
                  name="maxTermDays"
                  type="number"
                  min={0}
                  defaultValue={riskAnalysis.maxTermDays}
                  disabled={!canEdit}
                />
                <FieldError>{fieldError("maxTermDays")}</FieldError>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Exigir entrada
                </span>
                <BooleanSelect
                  name="requiresDownPayment"
                  defaultValue={riskAnalysis.requiresDownPayment}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Exigir contrato formal
                </span>
                <BooleanSelect
                  name="requiresFormalContract"
                  defaultValue={riskAnalysis.requiresFormalContract}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Exigir garantias adicionais
                </span>
                <BooleanSelect
                  name="requiresAdditionalGuarantee"
                  defaultValue={riskAnalysis.requiresAdditionalGuarantee}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Permitir venda parcelada
                </span>
                <BooleanSelect
                  name="allowsInstallments"
                  defaultValue={riskAnalysis.allowsInstallments}
                  disabled={!canEdit}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Situacao da analise
                </span>
                <select
                  name="analysisStatus"
                  className={selectClassName}
                  defaultValue={riskAnalysis.analysisStatus}
                  disabled={!canEdit}
                >
                  {riskAnalysisStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 xl:col-span-2">
                <span className="text-xs font-medium text-foreground">
                  Parecer final
                </span>
                <select
                  name="finalOpinion"
                  className={selectClassName}
                  defaultValue={riskAnalysis.finalOpinion}
                  disabled={!canEdit}
                >
                  <option value="">Selecione</option>
                  {riskFinalOpinionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 xl:col-span-4">
                <span className="text-xs font-medium text-foreground">
                  Observacoes da analise
                </span>
                <textarea
                  name="notes"
                  className={textareaClassName}
                  defaultValue={riskAnalysis.notes}
                  disabled={!canEdit}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Criterios de analise</CardTitle>
              <CardDescription>
                Pontue criterios objetivos que impactam o score interno e
                registre o rating manual do analista.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["Historico de atrasos", "latePaymentHistoryScore"],
                ["Frequencia de inadimplencia", "defaultFrequencyScore"],
                ["Volume financeiro", "financialVolumeScore"],
                ["Tempo de relacionamento", "relationshipTimeScore"],
                ["Contrato ativo", "activeContractScore"],
                ["Protestos/restricoes", "externalRestrictionScore"],
                ["Concentracao de risco", "riskConcentrationScore"],
                ["Dependencia comercial", "commercialDependencyScore"],
                ["Score externo", "externalScoreCriterion"],
              ].map(([label, name]) => (
                <label key={name} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <Input
                    name={name}
                    type="number"
                    min={0}
                    max={1000}
                    defaultValue={riskAnalysis[name as keyof RiskAnalysisFormValues] as string}
                    disabled={!canEdit}
                  />
                  <FieldError>{fieldError(name)}</FieldError>
                </label>
              ))}
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Rating manual
                </span>
                <Input
                  name="manualAnalystRating"
                  defaultValue={riskAnalysis.manualAnalystRating}
                  disabled={!canEdit}
                />
              </label>
            </CardContent>
          </Card>
        </form>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Consulta externa</CardTitle>
          <CardDescription>
            Estrutura preparada para Serasa e Banco Central. Nesta etapa, as
            consultas registram feedback seguro sem chamar provedores externos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Serasa consultado"
              value={data.externalQuery.serasaConsulted ? "Sim" : "Nao"}
            />
            <Metric
              label="Ultima consulta Serasa"
              value={data.externalQuery.serasaLastQueryDate}
            />
            <Metric
              label="Banco Central consultado"
              value={data.externalQuery.centralBankConsulted ? "Sim" : "Nao"}
            />
            <Metric
              label="Ultima consulta Banco Central"
              value={data.externalQuery.centralBankLastQueryDate}
            />
            <Metric
              label="Resultado Serasa"
              value={data.externalQuery.serasaSummary}
            />
            <Metric
              label="Resultado Banco Central"
              value={data.externalQuery.centralBankSummary}
            />
            <Metric
              label="Score externo consolidado"
              value={data.externalQuery.consolidatedExternalScore}
            />
            <Metric
              label="Status da integracao"
              value={data.externalQuery.integrationStatus}
            />
          </div>

          {riskAnalysis ? (
            <div className="flex flex-wrap gap-3">
              <form action={externalAction}>
                <input type="hidden" name="customerId" value={data.customer.id} />
                <input type="hidden" name="riskAnalysisId" value={riskAnalysis.id} />
                <input type="hidden" name="sourceType" value="SERASA" />
                <Button icon={FileSearch} type="submit" disabled={!canEdit || isQuerying}>
                  Consultar Serasa
                </Button>
              </form>
              <form action={externalAction}>
                <input type="hidden" name="customerId" value={data.customer.id} />
                <input type="hidden" name="riskAnalysisId" value={riskAnalysis.id} />
                <input type="hidden" name="sourceType" value="CENTRAL_BANK" />
                <Button icon={Landmark} type="submit" disabled={!canEdit || isQuerying}>
                  Consultar Banco Central
                </Button>
              </form>
              <form action={externalAction}>
                <input type="hidden" name="customerId" value={data.customer.id} />
                <input type="hidden" name="riskAnalysisId" value={riskAnalysis.id} />
                <input type="hidden" name="sourceType" value="SERASA" />
                <Button icon={RefreshCw} type="submit" variant="outline" disabled={!canEdit || isQuerying}>
                  Atualizar consulta
                </Button>
              </form>
              <Button
                icon={History}
                type="button"
                variant="outline"
                onClick={() =>
                  setLocalMessage("Historico de consultas externas exibido neste card.")
                }
              >
                Ver historico da consulta
              </Button>
            </div>
          ) : (
            <AuthMessage tone="info">
              Inicie a analise de risco para registrar consultas externas.
            </AuthMessage>
          )}

          {data.externalQuery.queryRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Data</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Fonte</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Status</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Resultado</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Responsavel</th>
                  </tr>
                </thead>
                <tbody>
                  {data.externalQuery.queryRows.map((query) => (
                    <tr key={query.id} className="text-xs text-foreground">
                      <td className="border-b border-border/60 px-3 py-3">{query.createdAt}</td>
                      <td className="border-b border-border/60 px-3 py-3">
                        {riskExternalSourceLabels[query.sourceType]}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3">{query.status}</td>
                      <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                        {query.summaryResult}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">
                        {query.requestedByName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Historico das analises</CardTitle>
            <CardDescription>
              Evolucao do score, limite aprovado, parecer e origem da avaliacao.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.histories.length === 0 ? (
              <EmptyState
                title="Nenhum historico registrado."
                description="Cada salvamento relevante da analise cria uma linha de historico para auditoria."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Data</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Score</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Risco</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Limite</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Parecer</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Responsavel</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Origem</th>
                      <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.histories.map((history) => (
                      <tr key={history.id} className="text-xs text-foreground">
                        <td className="border-b border-border/60 px-3 py-3">{history.createdAt}</td>
                        <td className="border-b border-border/60 px-3 py-3">{history.score}</td>
                        <td className="border-b border-border/60 px-3 py-3">
                          <StatusBadge
                            label={riskLevelLabels[history.riskLevel]}
                            tone={riskLevelTones[history.riskLevel]}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3">{history.approvedSalesLimit}</td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{history.finalOpinion}</td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{history.createdByName}</td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{history.source}</td>
                        <td className="border-b border-border/60 px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={tableActionClassName}
                              onClick={() =>
                                setLocalMessage(
                                  history.notes || "Historico selecionado para visualizacao.",
                                )
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </button>
                            {riskAnalysis ? (
                              <form action={reopenAction}>
                                <input type="hidden" name="customerId" value={data.customer.id} />
                                <input type="hidden" name="riskAnalysisId" value={riskAnalysis.id} />
                                <button
                                  type="submit"
                                  className={tableActionClassName}
                                  disabled={!canEdit || isReopening}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Reabrir
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historico de eventos de risco</CardTitle>
            <CardDescription>
              Eventos registrados pela analise interna e por consultas externas
              preparadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <EmptyState
                title="Nenhum evento de risco registrado."
                description="Eventos de abertura, revisao, alteracao de limite e consultas futuras aparecerao aqui."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Data</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Evento</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Descricao</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Responsavel</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Impacto</th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((event) => (
                      <tr key={event.id} className="text-xs text-foreground">
                        <td className="border-b border-border/60 px-3 py-3">{event.createdAt}</td>
                        <td className="border-b border-border/60 px-3 py-3">{event.eventType}</td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{event.description}</td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{event.createdByName}</td>
                        <td
                          className={cn(
                            "border-b border-border/60 px-3 py-3 font-semibold",
                            event.scoreImpact.startsWith("-")
                              ? "text-red-700 dark:text-red-300"
                              : "text-foreground",
                          )}
                        >
                          {event.scoreImpact}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{event.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

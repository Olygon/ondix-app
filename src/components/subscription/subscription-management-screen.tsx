"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  ReceiptText,
  ShieldAlert,
  WalletCards,
  X,
} from "lucide-react";

import {
  cancelSubscriberSubscriptionAction,
  prepareSubscriptionPaymentAction,
} from "@/features/subscription/actions";
import { AuthMessage } from "@/components/feedback/auth-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/helpers/cn";
import {
  initialSubscriptionActionState,
} from "@/features/subscription/types/subscription-form-state";
import {
  invoiceStatusLabels,
  invoiceStatusTones,
  paymentMethodLabels,
  subscriptionStatusLabels,
  subscriptionStatusTones,
} from "@/features/subscription/constants/subscription-constants";
import type {
  SubscriptionInvoiceRow,
  SubscriptionManagementPageData,
} from "@/features/subscription/types/subscription-types";

type SubscriptionManagementScreenProps = {
  data: SubscriptionManagementPageData;
};

const checkboxClassName =
  "h-4 w-4 rounded-[4px] border-border text-primary accent-primary";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center">
      <ReceiptText className="h-10 w-10 text-primary/70" />
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  description,
  icon: Icon,
  label,
  value,
}: {
  description?: string;
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[132px] flex-col justify-between gap-4 p-5">
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
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceStatusBadge({ status }: Pick<SubscriptionInvoiceRow, "status">) {
  return (
    <StatusBadge
      label={invoiceStatusLabels[status]}
      tone={invoiceStatusTones[status]}
    />
  );
}

export function SubscriptionManagementScreen({
  data,
}: SubscriptionManagementScreenProps) {
  const router = useRouter();
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [paymentState, paymentAction, isPaymentPending] = useActionState(
    prepareSubscriptionPaymentAction,
    initialSubscriptionActionState,
  );
  const [cancelState, cancelAction, isCancelPending] = useActionState(
    cancelSubscriberSubscriptionAction,
    initialSubscriptionActionState,
  );
  const payableInvoices = useMemo(
    () => data.invoices.filter((invoice) => invoice.isPayable),
    [data.invoices],
  );
  const selectedInvoices = useMemo(
    () =>
      data.invoices.filter((invoice) =>
        selectedInvoiceIds.includes(invoice.id),
      ),
    [data.invoices, selectedInvoiceIds],
  );
  const selectedTotal = selectedInvoices.reduce(
    (total, invoice) => total + invoice.amountValue,
    0,
  );
  const canPay = data.access.subscriptionManagement.canEdit;
  const canCancel =
    data.access.subscriptionManagement.canManage &&
    data.summary.status !== "CANCELED";
  const allPayableSelected =
    payableInvoices.length > 0 &&
    payableInvoices.every((invoice) => selectedInvoiceIds.includes(invoice.id));

  useEffect(() => {
    if (paymentState.status === "success") {
      router.refresh();
    }
  }, [paymentState.status, router]);

  useEffect(() => {
    if (cancelState.status === "success") {
      router.refresh();
    }
  }, [cancelState.status, router]);

  function toggleInvoice(invoice: SubscriptionInvoiceRow) {
    if (!canPay || !invoice.isPayable) {
      return;
    }

    setSelectedInvoiceIds((current) =>
      current.includes(invoice.id)
        ? current.filter((invoiceId) => invoiceId !== invoice.id)
        : [...current, invoice.id],
    );
  }

  function toggleAllPayable() {
    setSelectedInvoiceIds(
      allPayableSelected ? [] : payableInvoices.map((invoice) => invoice.id),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assinante"
        title="Gestao da assinatura"
        description={`Acompanhe o plano, vencimentos, faturas e pagamentos da conta assinante ${data.companyName}.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push("/assinante")}
            >
              Voltar
            </Button>
            <Button
              icon={Ban}
              type="button"
              variant="outline"
              disabled={!canCancel}
              onClick={() => setShowCancelConfirmation((current) => !current)}
            >
              Cancelar Assinatura
            </Button>
          </div>
        }
      />

      {showCancelConfirmation && canCancel ? (
        <Card className="border-red-300/70">
          <CardContent className="flex flex-col gap-4 px-6 py-6">
            <AuthMessage tone="warning">
              O cancelamento altera apenas o status da assinatura. A empresa,
              usuarios, permissoes, faturas e historico permanecem preservados.
            </AuthMessage>

            <div className="flex flex-wrap gap-3">
              <form action={cancelAction}>
                <Button
                  icon={Ban}
                  type="submit"
                  disabled={isCancelPending}
                >
                  {isCancelPending ? "Cancelando" : "Confirmar Cancelamento"}
                </Button>
              </form>

              <Button
                icon={X}
                type="button"
                variant="outline"
                onClick={() => setShowCancelConfirmation(false)}
              >
                Manter Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {paymentState.status === "success" && paymentState.message ? (
        <AuthMessage tone="success">{paymentState.message}</AuthMessage>
      ) : null}

      {paymentState.status === "error" && paymentState.message ? (
        <AuthMessage tone="error">{paymentState.message}</AuthMessage>
      ) : null}

      {cancelState.status === "success" && cancelState.message ? (
        <AuthMessage tone="success">{cancelState.message}</AuthMessage>
      ) : null}

      {cancelState.status === "error" && cancelState.message ? (
        <AuthMessage tone="error">{cancelState.message}</AuthMessage>
      ) : null}

      {!canPay ? (
        <AuthMessage tone="info">
          Seu perfil atual possui acesso de visualizacao. Pagamentos e
          cancelamento dependem de permissao de edicao ou gestao da assinatura.
        </AuthMessage>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CreditCard}
          label="Plano da assinatura"
          value={data.summary.planName}
          description={`Codigo ${data.summary.code}`}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Proximo vencimento"
          value={data.summary.nextDueDate}
          description={data.summary.nextChargeAmount}
        />
        <SummaryCard
          icon={WalletCards}
          label="Total em aberto"
          value={data.summary.totalOpenAmount}
          description="Soma das faturas abertas, pendentes e vencidas."
        />
        <Card>
          <CardContent className="flex min-h-[132px] flex-col justify-between gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Status da assinatura
              </p>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <div>
              <StatusBadge
                label={subscriptionStatusLabels[data.summary.status]}
                tone={subscriptionStatusTones[data.summary.status]}
                className="mb-3"
              />
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span>Ativa</span>
                <span>Bloqueada</span>
                <span>Cancelada</span>
                <span>Suspensa</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <CardHeader>
            <CardTitle>Proxima cobranca</CardTitle>
            <CardDescription>
              Cobranca prioritaria para pagamento da assinatura da empresa
              ativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.nextCharge ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[8px] border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Referencia
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {data.nextCharge.reference}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Valor
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {data.nextCharge.amount}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Vencimento
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {data.nextCharge.dueDate}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-2">
                      <InvoiceStatusBadge status={data.nextCharge.status} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Forma de pagamento
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {paymentMethodLabels[data.nextCharge.paymentMethod]}
                    </p>
                  </div>

                  <form action={paymentAction}>
                    <input
                      type="hidden"
                      name="invoiceIds"
                      value={data.nextCharge.id}
                    />
                    <Button
                      icon={CreditCard}
                      type="submit"
                      disabled={
                        !canPay ||
                        !data.nextCharge.isPayable ||
                        isPaymentPending
                      }
                    >
                      {isPaymentPending ? "Preparando" : "Pagar"}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Nenhuma cobranca futura encontrada."
                description="Quando uma nova fatura de assinatura for gerada, ela aparecera aqui com valor, vencimento, status e forma de pagamento."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Faturas da assinatura</CardTitle>
                <CardDescription>
                  Faturas vencidas e nao pagas aparecem primeiro para facilitar
                  a regularizacao financeira.
                </CardDescription>
              </div>
              <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Selecionado
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(selectedTotal)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.invoices.length === 0 ? (
              <EmptyState
                title="Nenhuma fatura cadastrada."
                description="A estrutura financeira ja esta pronta. Assim que as faturas forem geradas ou importadas da integracao de pagamento, a listagem sera exibida aqui."
              />
            ) : (
              <div className="space-y-5">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className={checkboxClassName}
                              checked={allPayableSelected}
                              disabled={!canPay || payableInvoices.length === 0}
                              onChange={toggleAllPayable}
                            />
                            <span>Selecionar</span>
                          </label>
                        </th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          Referencia
                        </th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          Vencimento
                        </th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          Valor
                        </th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          Status
                        </th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          Dias em atraso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((invoice) => {
                        const isSelected = selectedInvoiceIds.includes(invoice.id);

                        return (
                          <tr
                            key={invoice.id}
                            className={cn(
                              "text-xs text-foreground",
                              invoice.isPayable ? "cursor-pointer" : "opacity-75",
                            )}
                            onClick={() => toggleInvoice(invoice)}
                          >
                            <td className="border-b border-border/60 px-3 py-3 align-middle">
                              <input
                                type="checkbox"
                                className={checkboxClassName}
                                checked={isSelected}
                                disabled={!canPay || !invoice.isPayable}
                                onChange={() => toggleInvoice(invoice)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Selecionar fatura ${invoice.reference}`}
                              />
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary/70" />
                                <span className="font-semibold">
                                  {invoice.reference}
                                </span>
                              </div>
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                              {invoice.dueDate}
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                              {invoice.amount}
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle">
                              <InvoiceStatusBadge status={invoice.status} />
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                              {invoice.daysPastDue || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedInvoiceIds.length} fatura
                      {selectedInvoiceIds.length === 1 ? "" : "s"} selecionada
                      {selectedInvoiceIds.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Total para pagamento: {formatCurrency(selectedTotal)}
                    </p>
                  </div>

                  <form action={paymentAction}>
                    {selectedInvoiceIds.map((invoiceId) => (
                      <input
                        key={invoiceId}
                        type="hidden"
                        name="invoiceIds"
                        value={invoiceId}
                      />
                    ))}
                    <Button
                      icon={CheckCircle2}
                      type="submit"
                      disabled={
                        !canPay ||
                        selectedInvoiceIds.length === 0 ||
                        isPaymentPending
                      }
                    >
                      {isPaymentPending ? "Preparando" : "Pagar selecionadas"}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

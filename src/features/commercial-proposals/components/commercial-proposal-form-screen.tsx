"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  FileDown,
  FileSignature,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import {
  approveCommercialProposalAction,
  deleteCommercialProposalAction,
  generateContractFromCommercialProposalAction,
  saveCommercialProposalAction,
  sendCommercialProposalAction,
} from "@/features/commercial-proposals/actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  commercialProposalBaseRoute,
  commercialProposalEditableStatusOptions,
  commercialProposalPaymentMethodOptions,
  commercialProposalStatusLabels,
  commercialProposalStatusTones,
} from "@/features/commercial-proposals/constants/commercial-proposal-constants";
import {
  initialCommercialProposalActionState,
  initialCommercialProposalCollectionActionState,
} from "@/features/commercial-proposals/types/commercial-proposal-form-state";
import type {
  CommercialProposalFormPageData,
  CommercialProposalFormValues,
  CommercialProposalItemFormValues,
} from "@/features/commercial-proposals/types/commercial-proposal-types";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const deleteButtonClassName =
  "border-red-700/70 bg-red-700 font-semibold text-white hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 dark:hover:text-white [&_svg]:stroke-[2.35]";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type CommercialProposalFormScreenProps = {
  data: CommercialProposalFormPageData;
};

type CalculatedItem = CommercialProposalItemFormValues & {
  itemDiscountTotal: number;
};

const financialAdjustmentFields: Array<{
  label: string;
  name: keyof Pick<
    CommercialProposalFormValues,
    | "deliveryCostAmount"
    | "globalDiscountAmount"
    | "materialCostAmount"
    | "otherCostAmount"
  >;
}> = [
  { label: "Desconto global da proposta", name: "globalDiscountAmount" },
  { label: "Valor de custo de entrega", name: "deliveryCostAmount" },
  { label: "Valor de custo de material", name: "materialCostAmount" },
  { label: "Outros valores", name: "otherCostAmount" },
];

function parseNumberInput(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatNumberInput(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(roundMoney(value));
}

function getCalculatedItem(item: CommercialProposalItemFormValues): CalculatedItem {
  const unitPrice = parseNumberInput(item.unitPriceAmount);
  const quantity = parseNumberInput(item.quantity);
  const discountAmount = parseNumberInput(item.lineDiscountAmount);
  const discountPercent = parseNumberInput(item.lineDiscountPercent);
  const subtotal = roundMoney(unitPrice * quantity);
  const discountFromPercent = roundMoney(subtotal * (discountPercent / 100));
  const itemDiscountTotal = roundMoney(discountAmount + discountFromPercent);
  const total = roundMoney(subtotal - itemDiscountTotal);

  return {
    ...item,
    itemDiscountTotal,
    lineSubtotalAmount: formatNumberInput(subtotal),
    lineTotalAmount: formatNumberInput(total),
  };
}

function emptyItem(sortOrder: number): CommercialProposalItemFormValues {
  return {
    id: null,
    lineDiscountAmount: "0",
    lineDiscountPercent: "0",
    lineSubtotalAmount: "0",
    lineTotalAmount: "0",
    quantity: "1",
    serviceCodeSnapshot: "",
    serviceDescriptionSnapshot: "",
    serviceId: "",
    serviceNameSnapshot: "",
    sortOrder,
    unitPriceAmount: "0",
  };
}

function currentDateTimeLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

export function CommercialProposalFormScreen({
  data,
}: CommercialProposalFormScreenProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<CommercialProposalFormValues>(
    data.proposal,
  );
  const [items, setItems] = useState<CommercialProposalItemFormValues[]>(
    data.items.length > 0 ? data.items : [emptyItem(0)],
  );
  const [state, formAction, isSaving] = useActionState(
    saveCommercialProposalAction,
    initialCommercialProposalActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const [approveState, approveAction, isApproving] = useActionState(
    approveCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const [sendState, sendAction, isSending] = useActionState(
    sendCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const [contractState, contractAction, isGeneratingContract] = useActionState(
    generateContractFromCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const isContracted =
    formValues.status === "CONTRACTED" || Boolean(formValues.contractId);
  const canSave = data.isEditMode
    ? data.access.proposals.canEdit && !isContracted
    : data.access.proposals.canAdd;
  const canDelete =
    data.isEditMode &&
    data.access.proposals.canDelete &&
    !isContracted &&
    Boolean(data.proposal.id);
  const isReadOnly = (data.isEditMode && !data.access.proposals.canEdit) || isContracted;
  const calculatedItems = useMemo(() => items.map(getCalculatedItem), [items]);
  const totals = useMemo(() => {
    const subtotal = roundMoney(
      calculatedItems.reduce(
        (total, item) => total + parseNumberInput(item.lineSubtotalAmount),
        0,
      ),
    );
    const itemDiscounts = roundMoney(
      calculatedItems.reduce((total, item) => total + item.itemDiscountTotal, 0),
    );
    const globalDiscount = parseNumberInput(formValues.globalDiscountAmount);
    const deliveryCost = parseNumberInput(formValues.deliveryCostAmount);
    const materialCost = parseNumberInput(formValues.materialCostAmount);
    const otherCost = parseNumberInput(formValues.otherCostAmount);
    const totalDiscount = roundMoney(itemDiscounts + globalDiscount);
    const totalAmount = roundMoney(
      subtotal - totalDiscount + deliveryCost + materialCost + otherCost,
    );

    return {
      subtotalAmount: formatNumberInput(subtotal),
      totalAmount: formatNumberInput(totalAmount),
      totalDiscountAmount: formatNumberInput(totalDiscount),
    };
  }, [
    calculatedItems,
    formValues.deliveryCostAmount,
    formValues.globalDiscountAmount,
    formValues.materialCostAmount,
    formValues.otherCostAmount,
  ]);
  const itemsPayload = useMemo(
    () =>
      calculatedItems.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    [calculatedItems],
  );
  const statusOptions = useMemo(() => {
    const hasCurrentStatus = commercialProposalEditableStatusOptions.some(
      (option) => option.value === formValues.status,
    );

    if (hasCurrentStatus) {
      return commercialProposalEditableStatusOptions;
    }

    return [
      ...commercialProposalEditableStatusOptions,
      {
        label: commercialProposalStatusLabels[formValues.status],
        value: formValues.status,
      },
    ];
  }, [formValues.status]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (!data.isEditMode && state.savedId) {
      router.replace(`${commercialProposalBaseRoute}/${state.savedId}`);
      return;
    }

    router.refresh();
  }, [data.isEditMode, router, state.savedId, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.push(commercialProposalBaseRoute);
    }
  }, [deleteState.status, router]);

  useEffect(() => {
    if (
      approveState.status === "success" ||
      sendState.status === "success" ||
      contractState.status === "success"
    ) {
      router.refresh();
    }
  }, [approveState.status, contractState.status, router, sendState.status]);

  function updateField<K extends keyof CommercialProposalFormValues>(
    name: K,
    value: CommercialProposalFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateItem(
    index: number,
    patch: Partial<CommercialProposalItemFormValues>,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function handleServiceChange(index: number, serviceId: string) {
    const service = data.serviceOptions.find((option) => option.id === serviceId);

    updateItem(index, {
      serviceCodeSnapshot: service?.code ?? "",
      serviceDescriptionSnapshot: service?.description ?? "",
      serviceId,
      serviceNameSnapshot: service?.name ?? "",
      unitPriceAmount: service?.priceAmount ?? "0",
    });
  }

  function handleServiceCodeBlur(index: number, code: string) {
    const normalizedCode = code.replace(/\D/g, "");
    const service = data.serviceOptions.find(
      (option) =>
        option.code.replace(/\D/g, "") === normalizedCode ||
        option.code.toLowerCase() === code.trim().toLowerCase(),
    );

    if (service) {
      handleServiceChange(index, service.id);
    }
  }

  function addItem() {
    setItems((current) => [...current, emptyItem(current.length)]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      const nextItems = current.filter((_, itemIndex) => itemIndex !== index);

      return nextItems.length > 0
        ? nextItems.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }))
        : [emptyItem(0)];
    });
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];
  const proposalId = data.proposal.id ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial / Propostas Comerciais"
        title={data.isEditMode ? "Cadastro da proposta" : "Nova proposta comercial"}
        description={`Propostas comerciais da empresa ativa ${data.companyName}.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push(commercialProposalBaseRoute)}
            >
              Voltar
            </Button>

            {canSave ? (
              <Button
                form="commercial-proposal-form"
                icon={Save}
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Salvando" : "Salvar"}
              </Button>
            ) : null}

            {data.isEditMode && proposalId && data.canApprove && data.access.proposals.canEdit && formValues.status !== "APPROVED" && !isContracted ? (
              <form
                action={approveAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      `Aprovacao por ${data.currentUserName} em ${currentDateTimeLabel()}.\nConfirmar aprovacao da proposta?`,
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="proposalId" value={proposalId} />
                <Button
                  icon={BadgeCheck}
                  type="submit"
                  variant="outline"
                  disabled={isApproving}
                >
                  Aprovar
                </Button>
              </form>
            ) : null}

            {data.isEditMode && proposalId && data.access.proposals.canView ? (
              <Button
                icon={FileDown}
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(`${commercialProposalBaseRoute}/${proposalId}/pdf`, "_blank", "noopener,noreferrer")
                }
              >
                Gerar PDF
              </Button>
            ) : null}

            {data.isEditMode && proposalId && data.access.proposals.canEdit && !isContracted ? (
              <form
                action={sendAction}
                onSubmit={(event) => {
                  if (!window.confirm("Enviar a proposta para o e-mail cadastrado do cliente?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="proposalId" value={proposalId} />
                <Button
                  icon={Send}
                  type="submit"
                  variant="outline"
                  disabled={isSending}
                >
                  Enviar
                </Button>
              </form>
            ) : null}

            {data.isEditMode && proposalId && data.access.proposals.canEdit && formValues.status === "APPROVED" && !formValues.contractId ? (
              <form
                action={contractAction}
                onSubmit={(event) => {
                  if (!window.confirm("Gerar contrato a partir desta proposta aprovada?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="proposalId" value={proposalId} />
                <Button
                  icon={FileSignature}
                  type="submit"
                  variant="outline"
                  disabled={isGeneratingContract}
                >
                  Gerar contrato
                </Button>
              </form>
            ) : null}

            {canDelete ? (
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Deseja excluir esta proposta? O registro sera preservado no historico.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="proposalId" value={proposalId} />
                <Button
                  icon={Trash2}
                  type="submit"
                  variant="outline"
                  className={deleteButtonClassName}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo" : "Excluir"}
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      {[state, deleteState, approveState, sendState, contractState].map((actionState, index) =>
        actionState.status !== "idle" && actionState.message ? (
          <AuthMessage
            key={`${actionState.status}-${index}`}
            tone={actionState.status === "success" ? "success" : "error"}
          >
            {actionState.message}
          </AuthMessage>
        ) : null,
      )}

      {isReadOnly ? (
        <AuthMessage tone="info">
          Esta proposta esta em modo somente leitura para o seu perfil ou por ja
          estar vinculada a contrato.
        </AuthMessage>
      ) : null}

      <form id="commercial-proposal-form" action={formAction} className="space-y-6">
        <input type="hidden" name="proposalId" value={proposalId} />
        <input type="hidden" name="itemsJson" value={JSON.stringify(itemsPayload)} />

        <Card>
          <CardHeader>
            <CardTitle>Dados gerais</CardTitle>
            <CardDescription>
              Identificacao da proposta, cliente, validade e aprovacao.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs font-medium text-foreground">Codigo</span>
              <Input value={formValues.code} disabled />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs font-medium text-foreground">Data de criacao *</span>
              <Input
                name="issueDate"
                type="date"
                value={formValues.issueDate}
                disabled={isReadOnly}
                onChange={(event) => updateField("issueDate", event.target.value)}
              />
              {fieldError("issueDate") ? (
                <span className={fieldMessageClassName}>{fieldError("issueDate")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs font-medium text-foreground">Data de validade *</span>
              <Input
                name="validUntil"
                type="date"
                value={formValues.validUntil}
                disabled={isReadOnly}
                onChange={(event) => updateField("validUntil", event.target.value)}
              />
              {fieldError("validUntil") ? (
                <span className={fieldMessageClassName}>{fieldError("validUntil")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-6">
              <span className="text-xs font-medium text-foreground">Cliente *</span>
              <select
                name="customerId"
                className={selectClassName}
                value={formValues.customerId}
                disabled={isReadOnly}
                onChange={(event) => updateField("customerId", event.target.value)}
              >
                <option value="">Selecione</option>
                {data.customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </select>
              {fieldError("customerId") ? (
                <span className={fieldMessageClassName}>{fieldError("customerId")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-3">
              <span className="text-xs font-medium text-foreground">Data da aprovacao</span>
              <Input value={formValues.approvedAt} disabled />
            </label>

            <label className="flex flex-col gap-2 md:col-span-3">
              <span className="text-xs font-medium text-foreground">Aprovado por</span>
              <Input value={formValues.approvedByName} disabled />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Itens da proposta</CardTitle>
                <CardDescription>
                  Selecione servicos cadastrados, ajuste valores e preserve os
                  snapshots comerciais.
                </CardDescription>
              </div>
              <Button
                icon={Plus}
                type="button"
                size="sm"
                disabled={isReadOnly}
                onClick={addItem}
              >
                Adicionar item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldError("items") ? (
              <span className={fieldMessageClassName}>{fieldError("items")}</span>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Servico</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Codigo</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Descricao</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Unitario</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Qtd</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Desc. R$</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Desc. %</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Subtotal</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Total</th>
                    <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedItems.map((item, index) => (
                    <tr key={`${item.id ?? "new"}-${index}`} className="text-xs text-foreground">
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <select
                          className={selectClassName}
                          value={item.serviceId}
                          disabled={isReadOnly}
                          onChange={(event) => handleServiceChange(index, event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {data.serviceOptions.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input
                          value={item.serviceCodeSnapshot}
                          disabled={isReadOnly}
                          onBlur={(event) => handleServiceCodeBlur(index, event.target.value)}
                          onChange={(event) =>
                            updateItem(index, {
                              serviceCodeSnapshot: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input
                          value={item.serviceDescriptionSnapshot}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            updateItem(index, {
                              serviceDescriptionSnapshot: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input
                          value={item.unitPriceAmount}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            updateItem(index, { unitPriceAmount: event.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input
                          value={item.quantity}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            updateItem(index, { quantity: event.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input
                          value={item.lineDiscountAmount}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            updateItem(index, {
                              lineDiscountAmount: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input
                          value={item.lineDiscountPercent}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            updateItem(index, {
                              lineDiscountPercent: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input value={item.lineSubtotalAmount} disabled />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <Input value={item.lineTotalAmount} disabled />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className={deleteActionIconClassName}
                            aria-label="Excluir item"
                            title="Excluir item"
                            disabled={isReadOnly}
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajustes financeiros</CardTitle>
            <CardDescription>
              Desconto global e custos adicionais considerados na totalizacao.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {financialAdjustmentFields.map((field) => (
              <label key={field.name} className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">{field.label}</span>
                <Input
                  name={field.name}
                  value={formValues[field.name]}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateField(field.name, event.target.value)
                  }
                />
                {fieldError(field.name) ? (
                  <span className={fieldMessageClassName}>{fieldError(field.name)}</span>
                ) : null}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totais</CardTitle>
            <CardDescription>
              Valores calculados automaticamente a partir dos itens e ajustes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Subtotal da proposta</span>
              <Input value={totals.subtotalAmount} disabled />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Total de descontos</span>
              <Input value={totals.totalDiscountAmount} disabled />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Valor total final</span>
              <Input value={totals.totalAmount} disabled />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condicoes comerciais</CardTitle>
            <CardDescription>
              Prazo de entrega, forma de pagamento e entrada negociada.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Prazo de entrega</span>
              <Input
                name="deliveryDeadline"
                value={formValues.deliveryDeadline}
                disabled={isReadOnly}
                onChange={(event) => updateField("deliveryDeadline", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Forma de pagamento</span>
              <select
                name="paymentMethod"
                className={selectClassName}
                value={formValues.paymentMethod}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField(
                    "paymentMethod",
                    event.target.value as CommercialProposalFormValues["paymentMethod"],
                  )
                }
              >
                {commercialProposalPaymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Valor de entrada</span>
              <Input
                name="downPaymentAmount"
                value={formValues.downPaymentAmount}
                disabled={isReadOnly}
                onChange={(event) => updateField("downPaymentAmount", event.target.value)}
              />
              {fieldError("downPaymentAmount") ? (
                <span className={fieldMessageClassName}>{fieldError("downPaymentAmount")}</span>
              ) : null}
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status e observacoes</CardTitle>
            <CardDescription>
              Controle da etapa comercial e anotacoes internas da proposta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Status</span>
              <select
                name="status"
                className={selectClassName}
                value={formValues.status}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value as CommercialProposalFormValues["status"],
                  )
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <StatusBadge
                label={commercialProposalStatusLabels[formValues.status]}
                tone={commercialProposalStatusTones[formValues.status]}
                className="w-fit"
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs font-medium text-foreground">Observacoes internas</span>
              <Textarea
                name="notes"
                value={formValues.notes}
                disabled={isReadOnly}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>
          </CardContent>
        </Card>

        {data.isEditMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Auditoria da proposta</CardTitle>
              <CardDescription>
                Registro basico de criacao, atualizacao e vinculo futuro com contrato.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-5">
              {[
                ["Criado em", data.createdAt || "Sem registro"],
                ["Criado por", data.createdByName || "Sem registro"],
                ["Atualizado em", data.updatedAt || "Sem registro"],
                ["Atualizado por", data.updatedByName || "Sem registro"],
                ["Contrato vinculado", formValues.contractId || "Nao vinculado"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[10px] border border-border/70 bg-background/50 px-4 py-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </form>
    </div>
  );
}

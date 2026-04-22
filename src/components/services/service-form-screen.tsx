"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  Landmark,
  Percent,
  Plus,
  Save,
  Tags,
  Trash2,
} from "lucide-react";

import {
  deleteProvidedServiceAction,
  deleteServiceMunicipalTaxRuleAction,
  saveProvidedServiceAction,
  saveServiceMunicipalTaxRuleAction,
} from "@/app/(authenticated)/crm/servicos/actions";
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
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { providedServiceStatusOptions } from "@/lib/services/constants";
import {
  initialServiceCollectionActionState,
  initialServiceFormActionState,
} from "@/lib/services/form-state";
import type {
  MunicipalTaxCodeOption,
  ProvidedServiceFormPageData,
  ProvidedServiceFormValues,
  ServiceMunicipalTaxRuleRow,
} from "@/lib/services/types";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const deleteButtonClassName =
  "border-red-700/70 bg-red-700 font-semibold text-white hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 dark:hover:text-white [&_svg]:stroke-[2.35]";
const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type ServiceFormScreenProps = {
  data: ProvidedServiceFormPageData;
};

type TaxRuleDraft = {
  isDefault: boolean;
  issRate: string;
  municipalTaxCodeId: string;
  municipalityIbgeCode: string;
  notes: string;
};

const percentFields: Array<{
  label: string;
  name: keyof Pick<
    ProvidedServiceFormValues,
    | "taxSimpleNationalPercent"
    | "taxIcmsPercent"
    | "taxPisPercent"
    | "taxCofinsPercent"
    | "taxIbsPercent"
    | "taxCbsPercent"
    | "taxIrpjPercent"
    | "taxCsllPercent"
    | "taxCidPercent"
    | "taxIpiPercent"
  >;
}> = [
  { label: "Simples Nacional", name: "taxSimpleNationalPercent" },
  { label: "ICMS", name: "taxIcmsPercent" },
  { label: "PIS", name: "taxPisPercent" },
  { label: "COFINS", name: "taxCofinsPercent" },
  { label: "IBS", name: "taxIbsPercent" },
  { label: "CBS", name: "taxCbsPercent" },
  { label: "IRPJ", name: "taxIrpjPercent" },
  { label: "CSLL", name: "taxCsllPercent" },
  { label: "CID", name: "taxCidPercent" },
  { label: "IPI", name: "taxIpiPercent" },
];

function parseNumberInput(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumberInput(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

function getTaxCodeOption(
  options: MunicipalTaxCodeOption[],
  taxCodeId: string,
) {
  return options.find((option) => option.id === taxCodeId);
}

function TaxRuleRow({
  canEdit,
  customerTaxOptions,
  deleteAction,
  isDeleting,
  isSaving,
  rule,
  serviceId,
  taxRuleAction,
}: {
  canEdit: boolean;
  customerTaxOptions: MunicipalTaxCodeOption[];
  deleteAction: (payload: FormData) => void;
  isDeleting: boolean;
  isSaving: boolean;
  rule: ServiceMunicipalTaxRuleRow;
  serviceId: string;
  taxRuleAction: (payload: FormData) => void;
}) {
  return (
    <tr className="text-xs text-foreground">
      <td className="border-b border-border/60 px-3 py-3 align-top">
        <form id={`tax-rule-${rule.id}`} action={taxRuleAction} className="space-y-2">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="ruleId" value={rule.id} />
          <Input
            name="municipalityIbgeCode"
            defaultValue={rule.municipalityIbgeCode}
            disabled={!canEdit}
          />
        </form>
      </td>
      <td className="border-b border-border/60 px-3 py-3 align-top">
        <select
          form={`tax-rule-${rule.id}`}
          name="municipalTaxCodeId"
          className={selectClassName}
          defaultValue={rule.municipalTaxCodeId}
          disabled={!canEdit}
        >
          {customerTaxOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
        {rule.description}
      </td>
      <td className="border-b border-border/60 px-3 py-3 align-top">
        <Input
          form={`tax-rule-${rule.id}`}
          name="issRate"
          defaultValue={rule.issRate}
          disabled={!canEdit}
        />
      </td>
      <td className="border-b border-border/60 px-3 py-3 align-top">
        <label className="flex items-center justify-center">
          <input
            form={`tax-rule-${rule.id}`}
            type="checkbox"
            name="isDefault"
            defaultChecked={rule.isDefault}
            disabled={!canEdit}
            className="h-4 w-4 rounded-[4px] border-border text-primary accent-primary"
          />
          <span className="sr-only">Marcar como padrao</span>
        </label>
      </td>
      <td className="border-b border-border/60 px-3 py-3 align-top">
        <Input
          form={`tax-rule-${rule.id}`}
          name="notes"
          defaultValue={rule.notes}
          disabled={!canEdit}
        />
      </td>
      <td className="border-b border-border/60 px-3 py-3 align-top">
        <div className="flex justify-end gap-2">
          <button
            form={`tax-rule-${rule.id}`}
            type="submit"
            className={actionIconClassName}
            aria-label="Salvar vinculo municipal"
            title="Salvar vinculo"
            disabled={!canEdit || isSaving}
          >
            <Save className="h-4 w-4" />
          </button>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm("Deseja remover este vinculo municipal?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="ruleId" value={rule.id} />
            <button
              type="submit"
              className={deleteActionIconClassName}
              aria-label="Remover vinculo municipal"
              title="Remover vinculo"
              disabled={!canEdit || isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

export function ServiceFormScreen({ data }: ServiceFormScreenProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<ProvidedServiceFormValues>(
    data.service,
  );
  const [newRule, setNewRule] = useState<TaxRuleDraft>({
    isDefault: data.taxRules.length === 0,
    issRate: "0",
    municipalTaxCodeId: "",
    municipalityIbgeCode: "",
    notes: "",
  });
  const [state, formAction, isSaving] = useActionState(
    saveProvidedServiceAction,
    initialServiceFormActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteProvidedServiceAction,
    initialServiceCollectionActionState,
  );
  const [taxRuleState, taxRuleAction, isSavingTaxRule] = useActionState(
    saveServiceMunicipalTaxRuleAction,
    initialServiceFormActionState,
  );
  const [deleteTaxRuleState, deleteTaxRuleAction, isDeletingTaxRule] =
    useActionState(
      deleteServiceMunicipalTaxRuleAction,
      initialServiceCollectionActionState,
    );
  const canSave = data.isEditMode
    ? data.access.services.canEdit
    : data.access.services.canAdd;
  const canDelete = data.isEditMode && data.access.services.canDelete;
  const isReadOnly = data.isEditMode && !data.access.services.canEdit;
  const calculatedPrice = useMemo(() => {
    const cost = parseNumberInput(formValues.costAmount);
    const percentTotal =
      parseNumberInput(formValues.profitMarginPercent) +
      parseNumberInput(formValues.administrativeCostPercent) +
      parseNumberInput(formValues.commissionPercent) +
      percentFields.reduce(
        (total, field) => total + parseNumberInput(formValues[field.name]),
        0,
      );

    return cost * (1 + percentTotal / 100);
  }, [formValues]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (!data.isEditMode && state.savedId) {
      router.replace(`/crm/servicos/${state.savedId}`);
      return;
    }

    router.refresh();
  }, [data.isEditMode, router, state.savedId, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.push("/crm/servicos");
    }
  }, [deleteState.status, router]);

  useEffect(() => {
    if (
      taxRuleState.status === "success" ||
      deleteTaxRuleState.status === "success"
    ) {
      router.refresh();
    }
  }, [deleteTaxRuleState.status, router, taxRuleState.status]);

  function updateField<K extends keyof ProvidedServiceFormValues>(
    name: K,
    value: ProvidedServiceFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateNewRule<K extends keyof TaxRuleDraft>(
    name: K,
    value: TaxRuleDraft[K],
  ) {
    setNewRule((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleNewTaxCodeChange(taxCodeId: string) {
    const option = getTaxCodeOption(data.municipalTaxCodeOptions, taxCodeId);

    setNewRule((current) => ({
      ...current,
      issRate: option?.defaultIssRate ?? current.issRate,
      municipalTaxCodeId: taxCodeId,
      municipalityIbgeCode: option?.municipalityIbgeCode ?? current.municipalityIbgeCode,
    }));
  }

  function applyCalculatedPrice() {
    updateField("priceAmount", formatNumberInput(calculatedPrice));
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];
  const taxFieldError = (name: string) => taxRuleState.fieldErrors?.[name]?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadastros / Servicos"
        title={data.isEditMode ? "Cadastro do servico" : "Novo servico"}
        description={`Servicos prestados da empresa ativa ${data.companyName}.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push("/crm/servicos")}
            >
              Voltar
            </Button>

            {canSave ? (
              <Button
                form="provided-service-form"
                icon={Save}
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Salvando" : "Salvar"}
              </Button>
            ) : null}

            {canDelete && data.service.id ? (
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Deseja excluir este servico? O registro sera preservado no historico.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="serviceId" value={data.service.id} />
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

      {state.status === "success" && state.message ? (
        <AuthMessage tone="success">{state.message}</AuthMessage>
      ) : null}

      {state.status === "error" && state.message ? (
        <AuthMessage tone="error">{state.message}</AuthMessage>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <AuthMessage tone="error">{deleteState.message}</AuthMessage>
      ) : null}

      {taxRuleState.status === "success" && taxRuleState.message ? (
        <AuthMessage tone="success">{taxRuleState.message}</AuthMessage>
      ) : null}

      {taxRuleState.status === "error" && taxRuleState.message ? (
        <AuthMessage tone="error">{taxRuleState.message}</AuthMessage>
      ) : null}

      {deleteTaxRuleState.status === "success" && deleteTaxRuleState.message ? (
        <AuthMessage tone="success">{deleteTaxRuleState.message}</AuthMessage>
      ) : null}

      {deleteTaxRuleState.status === "error" && deleteTaxRuleState.message ? (
        <AuthMessage tone="error">{deleteTaxRuleState.message}</AuthMessage>
      ) : null}

      {isReadOnly ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao apenas para visualizar servicos.
          Alteracoes e exclusao permanecem bloqueadas.
        </AuthMessage>
      ) : null}

      <form id="provided-service-form" action={formAction} className="space-y-6">
        <input type="hidden" name="serviceId" value={data.service.id ?? ""} />

        <Card>
          <CardHeader>
            <CardTitle>Identificacao</CardTitle>
            <CardDescription>
              Codigo interno, descricao do servico e classificacoes fiscais
              gerais.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs font-medium text-foreground">Codigo</span>
              <Input value={formValues.code} disabled />
            </label>

            <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-5">
              <span className="text-xs font-medium text-foreground">
                Nome do servico *
              </span>
              <Input
                name="name"
                value={formValues.name}
                disabled={isReadOnly}
                onChange={(event) => updateField("name", event.target.value)}
              />
              {fieldError("name") ? (
                <span className={fieldMessageClassName}>{fieldError("name")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-6 xl:col-span-5">
              <span className="text-xs font-medium text-foreground">
                Codigo Lei 116/03 *
              </span>
              <select
                name="serviceLaw116Id"
                className={selectClassName}
                value={formValues.serviceLaw116Id}
                disabled={isReadOnly}
                onChange={(event) => updateField("serviceLaw116Id", event.target.value)}
              >
                <option value="">Selecione</option>
                {data.law116Options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.status === "INACTIVE" ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
              {fieldError("serviceLaw116Id") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("serviceLaw116Id")}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-6 xl:col-span-6">
              <span className="text-xs font-medium text-foreground">
                Descricao *
              </span>
              <Textarea
                name="description"
                value={formValues.description}
                disabled={isReadOnly}
                onChange={(event) => updateField("description", event.target.value)}
              />
              {fieldError("description") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("description")}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-6 xl:col-span-6">
              <span className="text-xs font-medium text-foreground">
                Codigo NBS *
              </span>
              <select
                name="serviceNbsId"
                className={selectClassName}
                value={formValues.serviceNbsId}
                disabled={isReadOnly}
                onChange={(event) => updateField("serviceNbsId", event.target.value)}
              >
                <option value="">Selecione</option>
                {data.nbsOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.status === "INACTIVE" ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
              {fieldError("serviceNbsId") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("serviceNbsId")}
                </span>
              ) : null}
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estrutura de custo e formacao de preco</CardTitle>
            <CardDescription>
              Base operacional para calculo do preco, com margem, custo
              administrativo e comissao.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Valor de custo
              </span>
              <Input
                name="costAmount"
                value={formValues.costAmount}
                disabled={isReadOnly}
                onChange={(event) => updateField("costAmount", event.target.value)}
              />
              {fieldError("costAmount") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("costAmount")}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Margem de lucro %
              </span>
              <Input
                name="profitMarginPercent"
                value={formValues.profitMarginPercent}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("profitMarginPercent", event.target.value)
                }
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Custo administrativo %
              </span>
              <Input
                name="administrativeCostPercent"
                value={formValues.administrativeCostPercent}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("administrativeCostPercent", event.target.value)
                }
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Comissao %
              </span>
              <Input
                name="commissionPercent"
                value={formValues.commissionPercent}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("commissionPercent", event.target.value)
                }
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <Percent className="h-4 w-4" />
              </span>
              <div>
                <CardTitle>Tributacao federal e geral</CardTitle>
                <CardDescription>
                  Percentuais gerais do servico. O ISS fica exclusivamente na
                  matriz municipal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            {percentFields.map((field) => (
              <label key={field.name} className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  {field.label} %
                </span>
                <Input
                  name={field.name}
                  value={formValues[field.name]}
                  disabled={isReadOnly}
                  onChange={(event) => updateField(field.name, event.target.value)}
                />
                {fieldError(field.name) ? (
                  <span className={fieldMessageClassName}>
                    {fieldError(field.name)}
                  </span>
                ) : null}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preco do servico</CardTitle>
            <CardDescription>
              Use o calculo sugerido ou informe manualmente o preco comercial.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Preco do servico
              </span>
              <Input
                name="priceAmount"
                value={formValues.priceAmount}
                disabled={isReadOnly}
                onChange={(event) => updateField("priceAmount", event.target.value)}
              />
              {fieldError("priceAmount") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("priceAmount")}
                </span>
              ) : null}
            </label>

            <div className="flex flex-col justify-end gap-2">
              <p className="text-xs text-muted-foreground">
                Calculado: {formatNumberInput(calculatedPrice)}
              </p>
              <Button
                icon={Calculator}
                type="button"
                variant="outline"
                disabled={isReadOnly}
                onClick={applyCalculatedPrice}
              >
                Usar calculo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>
              Servicos bloqueados ficam indisponiveis para usos futuros.
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
                    event.target.value as ProvidedServiceFormValues["status"],
                  )
                }
              >
                {providedServiceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </CardContent>
        </Card>

        {data.isEditMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Auditoria do cadastro</CardTitle>
              <CardDescription>
                Registro basico de criacao e ultima atualizacao do servico.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              {[
                ["Criado em", data.createdAt || "Sem registro"],
                ["Criado por", data.createdByName || "Sem registro"],
                ["Atualizado em", data.updatedAt || "Sem registro"],
                ["Atualizado por", data.updatedByName || "Sem registro"],
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

      <Card id="tributacao-municipal">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>Tributacao municipal</CardTitle>
              <CardDescription>
                Vincule o servico a cTribMun por municipio. A aliquota de ISS
                efetiva vem desta matriz.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!data.isEditMode || !data.service.id ? (
            <AuthMessage tone="info">
              Salve o servico antes de cadastrar os vinculos municipais de ISS.
            </AuthMessage>
          ) : (
            <div className="space-y-5">
              {data.taxRules.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-8 text-center">
                  <Tags className="mx-auto h-9 w-9 text-primary/70" />
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    Nenhum vinculo municipal cadastrado.
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
                    Adicione o municipio e o cTribMun para preparar o servico
                    para faturamento e NFS-e.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Municipio IBGE</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">cTribMun</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Descricao</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">ISS %</th>
                        <th className="border-b border-border/80 px-3 py-3 text-center font-semibold">Padrao</th>
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">Notas</th>
                        <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.taxRules.map((rule) => (
                        <TaxRuleRow
                          key={rule.id}
                          canEdit={canSave}
                          customerTaxOptions={data.municipalTaxCodeOptions}
                          deleteAction={deleteTaxRuleAction}
                          isDeleting={isDeletingTaxRule}
                          isSaving={isSavingTaxRule}
                          rule={rule}
                          serviceId={data.service.id!}
                          taxRuleAction={taxRuleAction}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form
                action={taxRuleAction}
                className="grid gap-4 rounded-[10px] border border-border bg-background/60 p-4 md:grid-cols-6"
              >
                <input type="hidden" name="serviceId" value={data.service.id} />
                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-xs font-medium text-foreground">cTribMun</span>
                  <select
                    name="municipalTaxCodeId"
                    className={selectClassName}
                    value={newRule.municipalTaxCodeId}
                    disabled={!canSave || data.municipalTaxCodeOptions.length === 0}
                    onChange={(event) => handleNewTaxCodeChange(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {data.municipalTaxCodeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {taxFieldError("municipalTaxCodeId") ? (
                    <span className={fieldMessageClassName}>
                      {taxFieldError("municipalTaxCodeId")}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Municipio IBGE
                  </span>
                  <Input
                    name="municipalityIbgeCode"
                    value={newRule.municipalityIbgeCode}
                    readOnly
                    disabled={!canSave}
                    onChange={(event) =>
                      updateNewRule("municipalityIbgeCode", event.target.value)
                    }
                  />
                  {taxFieldError("municipalityIbgeCode") ? (
                    <span className={fieldMessageClassName}>
                      {taxFieldError("municipalityIbgeCode")}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-foreground">ISS %</span>
                  <Input
                    name="issRate"
                    value={newRule.issRate}
                    disabled={!canSave}
                    onChange={(event) => updateNewRule("issRate", event.target.value)}
                  />
                </label>

                <label className="flex items-center gap-3 self-end rounded-[8px] border border-border bg-card px-3 py-3">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={newRule.isDefault}
                    disabled={!canSave}
                    className="h-4 w-4 rounded-[4px] border-border text-primary accent-primary"
                    onChange={(event) =>
                      updateNewRule("isDefault", event.target.checked)
                    }
                  />
                  <span className="text-xs font-medium text-foreground">Padrao</span>
                </label>

                <label className="flex flex-col gap-2 md:col-span-5">
                  <span className="text-xs font-medium text-foreground">Notas</span>
                  <Input
                    name="notes"
                    value={newRule.notes}
                    disabled={!canSave}
                    onChange={(event) => updateNewRule("notes", event.target.value)}
                  />
                </label>

                <div className="flex items-end">
                  <Button
                    icon={Plus}
                    type="submit"
                    disabled={!canSave || isSavingTaxRule}
                  >
                    Adicionar
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

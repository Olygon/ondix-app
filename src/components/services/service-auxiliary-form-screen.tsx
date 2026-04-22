"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import {
  inactivateAuxiliaryCodeAction,
  saveAuxiliaryCodeAction,
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
import {
  auxiliaryKindLabels,
  auxiliaryKindRoutes,
  entityStatusOptions,
} from "@/lib/services/constants";
import {
  initialServiceCollectionActionState,
  initialServiceFormActionState,
} from "@/lib/services/form-state";
import { brazilianStates } from "@/lib/company/constants";
import type {
  AuxiliaryCodeFormPageData,
  AuxiliaryCodeFormValues,
} from "@/lib/services/types";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const deleteButtonClassName =
  "border-red-700/70 bg-red-700 font-semibold text-white hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 dark:hover:text-white [&_svg]:stroke-[2.35]";
const defaultCardGridClassName = "grid gap-4 md:grid-cols-6 xl:grid-cols-12";
const municipalTaxCardGridClassName =
  "grid gap-4 md:grid-cols-[minmax(0,1fr)_80px_180px_140px_160px] xl:grid-cols-[minmax(0,1fr)_88px_190px_150px_170px]";

type ServiceAuxiliaryFormScreenProps = {
  data: AuxiliaryCodeFormPageData;
};

function parseDecimalInput(value: string) {
  const parsed = Number(value.trim().replace(/\./g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatIssRateInput(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    useGrouping: false,
  }).format(parseDecimalInput(value));
}

export function ServiceAuxiliaryFormScreen({
  data,
}: ServiceAuxiliaryFormScreenProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<AuxiliaryCodeFormValues>(
    data.auxiliaryCode,
  );
  const [state, formAction, isSaving] = useActionState(
    saveAuxiliaryCodeAction,
    initialServiceFormActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    inactivateAuxiliaryCodeAction,
    initialServiceCollectionActionState,
  );
  const route = auxiliaryKindRoutes[data.kind];
  const title = auxiliaryKindLabels[data.kind];
  const canSave = data.isEditMode
    ? data.access.services.canEdit
    : data.access.services.canAdd;
  const canDelete = data.isEditMode && data.access.services.canDelete;
  const isReadOnly = data.isEditMode && !data.access.services.canEdit;

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (!data.isEditMode && state.savedId) {
      router.replace(`${route}/${state.savedId}`);
      return;
    }

    router.refresh();
  }, [data.isEditMode, route, router, state.savedId, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.push(route);
    }
  }, [deleteState.status, route, router]);

  function updateField<K extends keyof AuxiliaryCodeFormValues>(
    name: K,
    value: AuxiliaryCodeFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];
  const codeLabel =
    data.kind === "law116"
      ? "Código Nacional"
      : data.kind === "municipalTax"
        ? "Código Municipal"
        : "Codigo NBS";
  const cardGridClassName =
    data.kind === "municipalTax"
      ? municipalTaxCardGridClassName
      : defaultCardGridClassName;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadastros / Servicos"
        title={data.isEditMode ? `Cadastro ${title}` : `Novo ${title}`}
        description="Tabela auxiliar geral compartilhada por todas as empresas."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push(route)}
            >
              Voltar
            </Button>

            {canSave ? (
              <Button
                form="auxiliary-code-form"
                icon={Save}
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Salvando" : "Salvar"}
              </Button>
            ) : null}

            {canDelete && data.auxiliaryCode.id ? (
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (!window.confirm("Deseja inativar este registro?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="kind" value={data.kind} />
                <input
                  type="hidden"
                  name="auxiliaryCodeId"
                  value={data.auxiliaryCode.id}
                />
                <Button
                  icon={Trash2}
                  type="submit"
                  variant="outline"
                  className={deleteButtonClassName}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Inativando" : "Inativar"}
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

      {isReadOnly ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao apenas para visualizar esta tabela.
          Alteracoes permanecem bloqueadas.
        </AuthMessage>
      ) : null}

      <form id="auxiliary-code-form" action={formAction} className="space-y-6">
        <input type="hidden" name="kind" value={data.kind} />
        <input
          type="hidden"
          name="auxiliaryCodeId"
          value={data.auxiliaryCode.id ?? ""}
        />

        <Card>
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
            <CardDescription>
              Estrutura geral sem companyId, preparada para uso por todas as
              empresas.
            </CardDescription>
          </CardHeader>
          <CardContent className={cardGridClassName}>
            {data.kind === "municipalTax" ? (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Municipio IBGE *
                </span>
                <Input
                  name="municipalityIbgeCode"
                  value={formValues.municipalityIbgeCode}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateField("municipalityIbgeCode", event.target.value)
                  }
                />
                {fieldError("municipalityIbgeCode") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("municipalityIbgeCode")}
                  </span>
                ) : null}
              </label>
            ) : null}

            {data.kind === "municipalTax" ? (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">UF *</span>
                <select
                  name="stateCode"
                  className={selectClassName}
                  value={formValues.stateCode}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("stateCode", event.target.value)}
                >
                  <option value="">Selecione</option>
                  {brazilianStates.map((stateOption) => (
                    <option key={stateOption.code} value={stateOption.code}>
                      {stateOption.code}
                    </option>
                  ))}
                </select>
                {fieldError("stateCode") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("stateCode")}
                  </span>
                ) : null}
              </label>
            ) : null}

            <label
              className={
                data.kind === "municipalTax"
                  ? "flex flex-col gap-2"
                  : "flex flex-col gap-2 md:col-span-3"
              }
            >
              <span className="text-xs font-medium text-foreground">
                {codeLabel} *
              </span>
              <Input
                name="code"
                value={formValues.code}
                disabled={isReadOnly}
                onChange={(event) => updateField("code", event.target.value)}
              />
              {fieldError("code") ? (
                <span className={fieldMessageClassName}>{fieldError("code")}</span>
              ) : null}
            </label>

            {data.kind !== "municipalTax" ? (
              <label className="flex flex-col gap-2 md:col-span-3">
                <span className="text-xs font-medium text-foreground">Categoria</span>
                <Input
                  name="category"
                  value={formValues.category}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("category", event.target.value)}
                />
              </label>
            ) : (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Aliquota padrao ISS %
                </span>
                <Input
                  name="defaultIssRate"
                  value={formValues.defaultIssRate}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateField("defaultIssRate", event.target.value)
                  }
                  onBlur={(event) =>
                    updateField(
                      "defaultIssRate",
                      formatIssRateInput(event.target.value),
                    )
                  }
                />
                {fieldError("defaultIssRate") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("defaultIssRate")}
                  </span>
                ) : null}
              </label>
            )}

            <label
              className={
                data.kind === "municipalTax"
                  ? "flex flex-col gap-2"
                  : "flex flex-col gap-2 md:col-span-3"
              }
            >
              <span className="text-xs font-medium text-foreground">Status</span>
              <select
                name="status"
                className={selectClassName}
                value={formValues.status}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value as AuxiliaryCodeFormValues["status"],
                  )
                }
              >
                {entityStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              className={
                data.kind === "municipalTax"
                  ? "flex flex-col gap-2 md:col-span-5 xl:col-span-5"
                  : "flex flex-col gap-2 md:col-span-6 xl:col-span-12"
              }
            >
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

            {data.kind === "law116" ? (
              <div className="flex flex-wrap gap-3 md:col-span-6 xl:col-span-12">
                {[
                  ["requiresConstruction", "Exige obra"],
                  ["requiresEvent", "Exige evento"],
                  ["requiresProperty", "Exige imovel"],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex items-center gap-3 rounded-[8px] border border-border bg-background/60 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      name={name}
                      checked={Boolean(
                        formValues[name as keyof AuxiliaryCodeFormValues],
                      )}
                      disabled={isReadOnly}
                      className="h-4 w-4 rounded-[4px] border-border text-primary accent-primary"
                      onChange={(event) =>
                        updateField(
                          name as keyof AuxiliaryCodeFormValues,
                          event.target.checked,
                        )
                      }
                    />
                    <span className="text-xs font-medium text-foreground">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

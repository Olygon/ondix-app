"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  FileCheck2,
  FileText,
  MapPin,
  Save,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import type { CustomerType } from "@prisma/client";

import {
  deleteCustomerAction,
  saveCustomerAction,
} from "@/app/(authenticated)/crm/cliente/actions";
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
import {
  customerStatusOptions,
  customerTypeOptions,
} from "@/lib/customer/constants";
import {
  formatCpf,
} from "@/lib/customer/formatters";
import {
  initialCustomerCollectionActionState,
  initialCustomerFormActionState,
} from "@/lib/customer/form-state";
import type {
  CustomerFormPageData,
  CustomerFormValues,
} from "@/lib/customer/types";
import {
  formatBrazilPhone,
  formatCnpj,
  formatPostalCode,
} from "@/lib/company/formatters";
import { brazilianStates } from "@/lib/company/constants";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const deleteButtonClassName =
  "border-red-700/70 bg-red-700 font-semibold text-white hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 dark:hover:text-white [&_svg]:stroke-[2.35]";

type CustomerFormScreenProps = {
  data: CustomerFormPageData;
};

function formatDocumentByType(value: string, type: CustomerType) {
  return type === "INDIVIDUAL" ? formatCpf(value) : formatCnpj(value);
}

export function CustomerFormScreen({ data }: CustomerFormScreenProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<CustomerFormValues>(data.customer);
  const [state, formAction, isSaving] = useActionState(
    saveCustomerAction,
    initialCustomerFormActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCustomerAction,
    initialCustomerCollectionActionState,
  );
  const canSave = data.isEditMode
    ? data.access.customers.canEdit
    : data.access.customers.canAdd;
  const canDelete = data.isEditMode && data.access.customers.canDelete;
  const isReadOnly = data.isEditMode && !data.access.customers.canEdit;

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (!data.isEditMode && state.savedCustomerId) {
      router.replace(`/crm/cliente/${state.savedCustomerId}`);
      return;
    }

    router.refresh();
  }, [data.isEditMode, router, state.savedCustomerId, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.push("/crm/cliente");
    }
  }, [deleteState.status, router]);

  function updateField<K extends keyof CustomerFormValues>(
    name: K,
    value: CustomerFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleTypeChange(type: CustomerType) {
    setFormValues((current) => ({
      ...current,
      federalDocument: formatDocumentByType(current.federalDocument, type),
      type,
    }));
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM / Comercial"
        title={data.isEditMode ? "Cadastro do cliente" : "Cadastro de Cliente"}
        description={`Dados cadastrais e informações contratuais para a empresa ativa ${data.companyName}.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push("/crm/cliente")}
            >
              Voltar
            </Button>

            {canSave ? (
              <Button
                form="customer-form"
                icon={Save}
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Salvando" : "Salvar"}
              </Button>
            ) : null}

            {data.isEditMode && data.customer.id ? (
              <Button
                icon={ShieldAlert}
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/crm/cliente/${data.customer.id}/analise-risco`)
                }
              >
                Analise de Risco
              </Button>
            ) : null}

            {data.isEditMode && data.customer.id ? (
              <Button
                icon={FileCheck2}
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/customers/${data.customer.id}/certificates`)
                }
              >
                Certidoes Negativas
              </Button>
            ) : null}

            {canDelete ? (
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Deseja excluir este cliente? O registro sera preservado no historico.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="customerId" value={data.customer.id ?? ""} />
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

      {isReadOnly ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao apenas para visualizar clientes. Alteracoes
          e exclusao permanecem bloqueadas.
        </AuthMessage>
      ) : null}

      <form id="customer-form" action={formAction} className="space-y-6">
        <input type="hidden" name="customerId" value={data.customer.id ?? ""} />

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <CardTitle>Dados principais</CardTitle>
                <CardDescription>
                  Identificacao, documento, contatos e status operacional do
                  cliente.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Codigo</span>
              <Input value={formValues.code} disabled />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">
                Tipo de cliente *
              </span>
              <select
                name="type"
                className={selectClassName}
                value={formValues.type}
                disabled={isReadOnly}
                onChange={(event) => handleTypeChange(event.target.value as CustomerType)}
              >
                {customerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldError("type") ? (
                <span className={fieldMessageClassName}>{fieldError("type")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-5">
              <span className="text-xs font-medium text-foreground">
                Nome do cliente *
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

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">CNPJ/CPF *</span>
              <Input
                name="federalDocument"
                value={formValues.federalDocument}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField(
                    "federalDocument",
                    formatDocumentByType(event.target.value, formValues.type),
                  )
                }
              />
              {fieldError("federalDocument") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("federalDocument")}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">
                Inscricao estadual
              </span>
              <Input
                name="stateDocument"
                value={formValues.stateDocument}
                disabled={isReadOnly}
                onChange={(event) => updateField("stateDocument", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">
                Inscricao municipal
              </span>
              <Input
                name="cityDocument"
                value={formValues.cityDocument}
                disabled={isReadOnly}
                onChange={(event) => updateField("cityDocument", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Status *</span>
              <select
                name="status"
                className={selectClassName}
                value={formValues.status}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value as CustomerFormValues["status"],
                  )
                }
              >
                {customerStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldError("status") ? (
                <span className={fieldMessageClassName}>{fieldError("status")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Telefone</span>
              <Input
                name="phone"
                value={formValues.phone}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("phone", formatBrazilPhone(event.target.value))
                }
              />
              {fieldError("phone") ? (
                <span className={fieldMessageClassName}>{fieldError("phone")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">WhatsApp</span>
              <Input
                name="whatsapp"
                value={formValues.whatsapp}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("whatsapp", formatBrazilPhone(event.target.value))
                }
              />
              {fieldError("whatsapp") ? (
                <span className={fieldMessageClassName}>{fieldError("whatsapp")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-6">
              <span className="text-xs font-medium text-foreground">E-mail</span>
              <Input
                name="email"
                type="email"
                value={formValues.email}
                disabled={isReadOnly}
                onChange={(event) => updateField("email", event.target.value)}
              />
              {fieldError("email") ? (
                <span className={fieldMessageClassName}>{fieldError("email")}</span>
              ) : null}
            </label>

            <label className="flex items-center gap-3 self-end rounded-[8px] border border-border bg-background/60 px-4 py-3 md:col-span-3 xl:col-span-6">
              <input
                type="checkbox"
                name="whatsappReminderEnabled"
                checked={formValues.whatsappReminderEnabled}
                disabled={isReadOnly}
                className="h-4 w-4 rounded-[4px] border-border text-primary accent-primary"
                onChange={(event) =>
                  updateField("whatsappReminderEnabled", event.target.checked)
                }
              />
              <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                <BellRing className="h-4 w-4 shrink-0 text-primary" />
                Enviar lembrete de vencimento via WhatsApp
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <CardTitle>Endereco</CardTitle>
                <CardDescription>
                  Localizacao principal do cliente para cadastros, contratos e
                  cobrancas futuras.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">CEP</span>
              <Input
                name="postalCode"
                value={formValues.postalCode}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("postalCode", formatPostalCode(event.target.value))
                }
              />
              {fieldError("postalCode") ? (
                <span className={fieldMessageClassName}>
                  {fieldError("postalCode")}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-5">
              <span className="text-xs font-medium text-foreground">Logradouro</span>
              <Input
                name="street"
                value={formValues.street}
                disabled={isReadOnly}
                onChange={(event) => updateField("street", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Numero</span>
              <Input
                name="streetNumber"
                value={formValues.streetNumber}
                disabled={isReadOnly}
                onChange={(event) => updateField("streetNumber", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">Complemento</span>
              <Input
                name="addressComplement"
                value={formValues.addressComplement}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateField("addressComplement", event.target.value)
                }
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-4">
              <span className="text-xs font-medium text-foreground">Bairro</span>
              <Input
                name="neighborhood"
                value={formValues.neighborhood}
                disabled={isReadOnly}
                onChange={(event) => updateField("neighborhood", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-4">
              <span className="text-xs font-medium text-foreground">Cidade</span>
              <Input
                name="city"
                value={formValues.city}
                disabled={isReadOnly}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 md:w-1/2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">UF</span>
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
                <span className={fieldMessageClassName}>{fieldError("stateCode")}</span>
              ) : null}
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <CardTitle>Informacoes contratuais</CardTitle>
                <CardDescription>
                  Area somente leitura preparada para a futura integracao com
                  contratos de clientes.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Numero do contrato
              </span>
              <Input value={formValues.contractNumber} disabled />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Plano contratado
              </span>
              <Input value={formValues.contractPlan} disabled />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Data de inicio</span>
              <Input value={formValues.contractStartDate} disabled placeholder="dd/mm/aaaa" />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Data de vencimento
              </span>
              <Input value={formValues.contractDueDate} disabled placeholder="dd/mm/aaaa" />
            </label>
          </CardContent>
        </Card>

        {data.isEditMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Auditoria do cadastro</CardTitle>
              <CardDescription>
                Registro basico de criacao e ultima atualizacao do cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[10px] border border-border/70 bg-background/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Criado em
                </p>
                <p className="mt-3 text-xs font-semibold text-foreground">
                  {data.createdAt || "Sem registro"}
                </p>
              </div>
              <div className="rounded-[10px] border border-border/70 bg-background/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Criado por
                </p>
                <p className="mt-3 text-xs font-semibold text-foreground">
                  {data.createdByName || "Sem registro"}
                </p>
              </div>
              <div className="rounded-[10px] border border-border/70 bg-background/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Atualizado em
                </p>
                <p className="mt-3 text-xs font-semibold text-foreground">
                  {data.updatedAt || "Sem registro"}
                </p>
              </div>
              <div className="rounded-[10px] border border-border/70 bg-background/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Atualizado por
                </p>
                <p className="mt-3 text-xs font-semibold text-foreground">
                  {data.updatedByName || "Sem registro"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </form>
    </div>
  );
}

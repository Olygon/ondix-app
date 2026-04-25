"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  CreditCard,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  cancelSubscriptionAction,
  saveSubscriberCompanyAction,
} from "@/features/subscriber-company/actions";
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
import { initialSubscriberCompanyActionState } from "@/features/subscriber-company/types/subscriber-company-form-state";
import {
  formatBrazilPhone,
  formatCnpj,
  formatPostalCode,
} from "@/lib/formatters/brazil";
import { brazilianStates } from "@/lib/constants/brazil";
import type { SubscriberCompanyPageData } from "@/features/subscriber-company/types/subscriber-company-types";

type SubscriberCompanyScreenProps = {
  data: SubscriberCompanyPageData;
};

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

const readOnlyClassName = "bg-background/60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";

function getSubscriptionStatusLabel(
  status: SubscriberCompanyPageData["company"]["subscriptionStatus"],
) {
  if (status === "BLOCKED") {
    return "Bloqueada";
  }

  if (status === "CANCELED") {
    return "Cancelada";
  }

  if (status === "PENDING") {
    return "Pendente";
  }

  if (status === "SUSPENDED") {
    return "Suspensa";
  }

  return "Ativa";
}

export function SubscriberCompanyScreen({ data }: SubscriberCompanyScreenProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    saveSubscriberCompanyAction,
    initialSubscriberCompanyActionState,
  );
  const adminMap = useMemo(
    () => new Map(data.adminOptions.map((item) => [item.id, item])),
    [data.adminOptions],
  );
  const [formValues, setFormValues] = useState(data.company);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(data.company.logoPreviewUrl);
  const [logoFileName, setLogoFileName] = useState(data.company.logoFileName);
  const [digitalCertificateFileName, setDigitalCertificateFileName] = useState(
    data.company.digitalCertificateFileName,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const canEditCompany = data.access.subscriberCompany.canEdit;
  const canOpenAccessManagement = data.access.accessManagement.canView;
  const canOpenSubscriptionManagement = data.access.subscriptionManagement.canView;
  const canManageSubscription = data.access.subscriptionManagement.canManage;
  const canCancelSubscription =
    canManageSubscription && formValues.subscriptionStatus !== "CANCELED";

  useEffect(() => {
    if (state.status === "success") {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [router, state.status]);

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];
  const hasLogo = Boolean(logoPreviewUrl || logoFileName);

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleMaskedFieldChange(name: keyof typeof formValues, value: string) {
    if (name === "taxId") {
      updateField(name, formatCnpj(value));
      return;
    }

    if (name === "postalCode") {
      updateField(name, formatPostalCode(value));
      return;
    }

    if (name === "companyPhone" || name === "responsibleAdminPhone") {
      updateField(name, formatBrazilPhone(value));
      return;
    }

    updateField(name, value);
  }

  function handleResponsibleAdminChange(adminUserId: string) {
    const selectedAdmin = adminMap.get(adminUserId);

    setFormValues((current) => ({
      ...current,
      responsibleAdminEmail: selectedAdmin?.email ?? "",
      responsibleAdminName: selectedAdmin?.fullName ?? "",
      responsibleAdminPhone: selectedAdmin?.phone ?? "",
      responsibleAdminUserId: adminUserId,
    }));
  }

  function handleLogoFileChange(file?: File | null) {
    if (!file) {
      setLogoFileName(data.company.logoFileName);
      setLogoPreviewUrl(data.company.logoPreviewUrl);
      return;
    }

    setRemoveLogo(false);
    setLogoFileName(file.name);
    const reader = new FileReader();

    reader.onload = () => {
      setLogoPreviewUrl(typeof reader.result === "string" ? reader.result : null);
    };

    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setRemoveLogo(true);
    setLogoFileName("");
    setLogoPreviewUrl(null);

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assinante"
        title="Cadastro da empresa assinante"
        description="Mantenha o cadastro principal da empresa, o administrador responsavel e o resumo da assinatura da conta ativa."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              form="subscriber-company-form"
              icon={Save}
              type="submit"
              variant="primary"
              disabled={!canEditCompany}
            >
              Salvar
            </Button>
            <Button
              icon={Ban}
              type="button"
              variant="outline"
              disabled={!canCancelSubscription}
              onClick={() => setShowCancelConfirmation((current) => !current)}
            >
              Cancelar Assinatura
            </Button>
            {canOpenAccessManagement ? (
              <Button
                icon={ShieldCheck}
                type="button"
                variant="outline"
                onClick={() => router.push("/assinante/gestao-acessos")}
              >
                Gestao de Acessos
              </Button>
            ) : null}
          </div>
        }
      />

      {showCancelConfirmation && canCancelSubscription ? (
        <Card className="border-red-300/70">
          <CardContent className="flex flex-col gap-4 px-6 py-6">
            <AuthMessage tone="error">
              Ao confirmar o cancelamento, apenas o status da assinatura sera
              alterado. A empresa, usuarios e historico financeiro nao serao
              excluidos.
            </AuthMessage>

            <div className="flex flex-wrap gap-3">
              <form action={cancelSubscriptionAction}>
                <Button icon={Ban} type="submit">
                  Confirmar Cancelamento
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

      {state.status === "success" && state.message ? (
        <AuthMessage tone="success">
          {state.message}
        </AuthMessage>
      ) : null}

      {state.status === "error" && state.message ? (
        <AuthMessage tone="error">
          {state.message}
        </AuthMessage>
      ) : null}

      {!canEditCompany ? (
        <AuthMessage tone="info">
          Seu perfil atual possui apenas visualizacao deste cadastro. Os dados da empresa
          e do administrador responsavel permanecem bloqueados para edicao.
        </AuthMessage>
      ) : null}

      <form id="subscriber-company-form" action={formAction} className="space-y-6">
        <input type="hidden" name="removeLogo" value={removeLogo ? "true" : "false"} />

        <Card>
          <CardHeader>
            <CardTitle>Cadastro da empresa</CardTitle>
            <CardDescription>
              Dados principais do assinante e informacoes de identificacao fiscal.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex aspect-square items-center justify-center rounded-card border border-dashed border-border bg-background/60 p-4">
                {logoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewUrl}
                    alt="Logo da empresa"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center text-xs text-muted-foreground">
                    <Building2 className="h-10 w-10 text-primary/70" />
                    <span>Nenhuma logo cadastrada</span>
                  </div>
                )}
              </div>

              <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
                Imagem da logo da empresa
                <div className="flex w-full items-stretch gap-2">
                  <input
                    ref={logoInputRef}
                    name="logoFile"
                    type="file"
                    accept="image/*"
                    disabled={!canEditCompany}
                    className="block min-w-0 flex-[1_1_auto] text-xs leading-[44px] text-transparent file:mr-0 file:h-11 file:w-full file:rounded-[6px] file:border-0 file:bg-primary/10 file:px-3 file:py-0 file:text-[12px] file:font-medium file:leading-[44px] file:text-primary"
                    onChange={(event) =>
                      handleLogoFileChange(event.target.files?.[0] ?? null)
                    }
                  />

                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={!canEditCompany || !hasLogo}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background/60 p-0 text-red-700 transition-colors hover:text-red-800 disabled:text-red-300 dark:text-red-300 dark:hover:text-red-200 dark:disabled:text-red-900/30"
                    aria-label="Excluir logo da empresa"
                    title="Excluir logo da empresa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
              <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-6">
                <span className="text-xs font-medium text-foreground">Razao Social *</span>
                <Input
                  name="legalName"
                  value={formValues.legalName}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("legalName", event.target.value)}
                />
                {fieldError("legalName") ? (
                  <span className={fieldMessageClassName}>{fieldError("legalName")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Nome Curto *</span>
                <Input
                  name="shortName"
                  value={formValues.shortName}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("shortName", event.target.value)}
                />
                {fieldError("shortName") ? (
                  <span className={fieldMessageClassName}>{fieldError("shortName")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">CNPJ *</span>
                <Input
                  name="taxId"
                  value={formValues.taxId}
                  disabled={!canEditCompany}
                  onChange={(event) => handleMaskedFieldChange("taxId", event.target.value)}
                />
                {fieldError("taxId") ? (
                  <span className={fieldMessageClassName}>{fieldError("taxId")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Inscricao Estadual</span>
                <Input
                  name="stateRegistration"
                  autoComplete="off"
                  value={formValues.stateRegistration}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("stateRegistration", event.target.value)
                  }
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Inscricao Municipal</span>
                <Input
                  name="municipalRegistration"
                  value={formValues.municipalRegistration}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("municipalRegistration", event.target.value)
                  }
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
                <span className="text-xs font-medium text-foreground">CNAE Primario *</span>
                <Input
                  name="primaryCnae"
                  value={formValues.primaryCnae}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("primaryCnae", event.target.value)}
                />
                {fieldError("primaryCnae") ? (
                  <span className={fieldMessageClassName}>{fieldError("primaryCnae")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
                <span className="text-xs font-medium text-foreground">CNAE Secundario</span>
                <Input
                  name="secondaryCnae"
                  value={formValues.secondaryCnae}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("secondaryCnae", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
                <span className="text-xs font-medium text-foreground">CEP *</span>
                <Input
                  name="postalCode"
                  value={formValues.postalCode}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    handleMaskedFieldChange("postalCode", event.target.value)
                  }
                />
                {fieldError("postalCode") ? (
                  <span className={fieldMessageClassName}>{fieldError("postalCode")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-6">
                <span className="text-xs font-medium text-foreground">Logradouro *</span>
                <Input
                  name="street"
                  value={formValues.street}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("street", event.target.value)}
                />
                {fieldError("street") ? (
                  <span className={fieldMessageClassName}>{fieldError("street")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
                <span className="text-xs font-medium text-foreground">Numero *</span>
                <Input
                  name="streetNumber"
                  value={formValues.streetNumber}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("streetNumber", event.target.value)}
                />
                {fieldError("streetNumber") ? (
                  <span className={fieldMessageClassName}>{fieldError("streetNumber")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-5">
                <span className="text-xs font-medium text-foreground">Complemento</span>
                <Input
                  name="addressComplement"
                  value={formValues.addressComplement}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("addressComplement", event.target.value)
                  }
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-5">
                <span className="text-xs font-medium text-foreground">Bairro *</span>
                <Input
                  name="district"
                  value={formValues.district}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("district", event.target.value)}
                />
                {fieldError("district") ? (
                  <span className={fieldMessageClassName}>{fieldError("district")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-4">
                <span className="text-xs font-medium text-foreground">Cidade *</span>
                <Input
                  name="city"
                  value={formValues.city}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("city", event.target.value)}
                />
                {fieldError("city") ? (
                  <span className={fieldMessageClassName}>{fieldError("city")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-1 xl:col-span-1">
                <span className="text-xs font-medium text-foreground">UF *</span>
                <select
                  name="stateCode"
                  value={formValues.stateCode}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("stateCode", event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Selecione</option>
                  {brazilianStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.code}
                    </option>
                  ))}
                </select>
                {fieldError("stateCode") ? (
                  <span className={fieldMessageClassName}>{fieldError("stateCode")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Telefone</span>
                <Input
                  name="companyPhone"
                  value={formValues.companyPhone}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    handleMaskedFieldChange("companyPhone", event.target.value)
                  }
                />
                {fieldError("companyPhone") ? (
                  <span className={fieldMessageClassName}>{fieldError("companyPhone")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-7">
                <span className="text-xs font-medium text-foreground">E-mail *</span>
                <Input
                  name="companyEmail"
                  type="email"
                  value={formValues.companyEmail}
                  disabled={!canEditCompany}
                  onChange={(event) => updateField("companyEmail", event.target.value)}
                />
                {fieldError("companyEmail") ? (
                  <span className={fieldMessageClassName}>{fieldError("companyEmail")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-5">
                <span className="text-xs font-medium text-foreground">
                  Nome do Socio Administrador
                </span>
                <Input
                  name="managingPartnerName"
                  value={formValues.managingPartnerName}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("managingPartnerName", event.target.value)
                  }
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">
                  Data da ultima alteracao
                </span>
                <Input disabled value={formValues.lastEditedAt} className={readOnlyClassName} />
              </label>

              <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-9">
                <span className="text-xs font-medium text-foreground">
                  Usuario que efetuou a alteracao
                </span>
                <Input
                  disabled
                  value={formValues.lastEditedByName}
                  className={readOnlyClassName}
                />
              </label>

              <div className="space-y-2 md:col-span-4 xl:col-span-8">
                <span className="text-xs font-medium text-foreground">
                  Certificado Digital
                </span>
                <input
                  name="digitalCertificateFile"
                  type="file"
                  disabled={!canEditCompany}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-[6px] file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-primary"
                  onChange={(event) =>
                    setDigitalCertificateFileName(
                      event.target.files?.[0]?.name ||
                        data.company.digitalCertificateFileName,
                    )
                  }
                />
                {digitalCertificateFileName ? (
                  <p className="text-xs text-muted-foreground">
                    Arquivo atual: {digitalCertificateFileName}
                  </p>
                ) : null}
              </div>

              <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-4">
                <span className="text-xs font-medium text-foreground">
                  Senha do Certificado
                </span>
                <Input
                  name="digitalCertificatePassword"
                  type="password"
                  value={formValues.digitalCertificatePassword}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("digitalCertificatePassword", event.target.value)
                  }
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Administrador responsavel</CardTitle>
              <CardDescription>
                Apenas usuarios com perfil administrativo vinculados a empresa podem ser
                informados como administrador da conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,0.64fr)_minmax(0,1.36fr)]">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-xs font-medium text-foreground">
                  Administrador da conta *
                </span>
                <select
                  name="responsibleAdminUserId"
                  value={formValues.responsibleAdminUserId}
                  disabled={!canEditCompany}
                  onChange={(event) => handleResponsibleAdminChange(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Selecione um administrador</option>
                  {data.adminOptions.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.fullName} - {admin.accessProfileName}
                    </option>
                  ))}
                </select>
                {fieldError("responsibleAdminUserId") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("responsibleAdminUserId")}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-xs font-medium text-foreground">
                  Nome do usuario Administrador
                </span>
                <Input
                  name="responsibleAdminName"
                  value={formValues.responsibleAdminName}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("responsibleAdminName", event.target.value)
                  }
                />
                {fieldError("responsibleAdminName") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("responsibleAdminName")}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Telefone WhatsApp *
                </span>
                <Input
                  name="responsibleAdminPhone"
                  value={formValues.responsibleAdminPhone}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    handleMaskedFieldChange(
                      "responsibleAdminPhone",
                      event.target.value,
                    )
                  }
                />
                {fieldError("responsibleAdminPhone") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("responsibleAdminPhone")}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  E-mail do Administrador *
                </span>
                <Input
                  name="responsibleAdminEmail"
                  type="email"
                  value={formValues.responsibleAdminEmail}
                  disabled={!canEditCompany}
                  onChange={(event) =>
                    updateField("responsibleAdminEmail", event.target.value)
                  }
                />
                {fieldError("responsibleAdminEmail") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("responsibleAdminEmail")}
                  </span>
                ) : null}
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo da Assinatura</CardTitle>
              <CardDescription>
                Informacoes contratuais somente leitura da empresa ativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Codigo do contrato</span>
                <Input
                  disabled
                  value={formValues.contractCode}
                  className={readOnlyClassName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">Plano da Assinatura</span>
                <Input
                  disabled
                  value={formValues.subscriptionPlan}
                  className={readOnlyClassName}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Data da Assinatura
                  </span>
                  <Input
                    disabled
                    value={formValues.subscriptionDate}
                    className={readOnlyClassName}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Status da Assinatura
                  </span>
                  <Input
                    disabled
                    value={getSubscriptionStatusLabel(formValues.subscriptionStatus)}
                    className={readOnlyClassName}
                  />
                </label>
              </div>

              {canOpenSubscriptionManagement ? (
                <Button
                  icon={CreditCard}
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/assinante/gestao-assinatura")}
                >
                  Gestao da Assinatura
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </form>
    </div>
  );
}

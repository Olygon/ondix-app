"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, KeyRound, Save, Trash2, UserRound } from "lucide-react";

import {
  cancelManagedUserAction,
  saveManagedUserAction,
} from "@/app/(authenticated)/assinante/gestao-acessos/actions";
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
import {
  initialCollectionActionState,
  initialUserAccountActionState,
} from "@/lib/access-management/form-state";
import {
  accessProfileTierLabels,
  getStatusTone,
  userStatusLabels,
  userStatusOptions,
} from "@/lib/access-management/constants";
import type { UserAccountPageData } from "@/lib/access-management/types";
import { formatBrazilPhone } from "@/lib/formatters/brazil";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const deleteButtonClassName =
  "border-red-700/70 bg-red-700 font-semibold text-white hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 dark:hover:text-white [&_svg]:stroke-[2.35]";

type UserAccountScreenProps = {
  data: UserAccountPageData;
};

export function UserAccountScreen({ data }: UserAccountScreenProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    saveManagedUserAction,
    initialUserAccountActionState,
  );
  const [deleteState, deleteAction] = useActionState(
    cancelManagedUserAction,
    initialCollectionActionState,
  );
  const [formValues, setFormValues] = useState(data.user);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(data.user.photoPreviewUrl);
  const [photoFileName, setPhotoFileName] = useState(data.user.photoFileName);
  const [removePhoto, setRemovePhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const canSave = data.isEditMode
    ? data.access.userAccount.canEdit
    : data.access.userAccount.canAdd;
  const canDelete = data.isEditMode && data.access.userAccount.canDelete;
  const isReadOnly = data.isEditMode && !data.access.userAccount.canEdit;

  useEffect(() => {
    if (state.status === "success" && data.isEditMode) {
      router.refresh();
    }
  }, [data.isEditMode, router, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.push("/assinante/gestao-acessos");
    }
  }, [deleteState.status, router]);

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePhoneChange(value: string) {
    updateField("phone", formatBrazilPhone(value));
  }

  function handlePhotoFileChange(file?: File | null) {
    if (!file) {
      setPhotoFileName(data.user.photoFileName);
      setPhotoPreviewUrl(data.user.photoPreviewUrl);
      return;
    }

    setRemovePhoto(false);
    setPhotoFileName(file.name);
    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreviewUrl(typeof reader.result === "string" ? reader.result : null);
    };

    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setRemovePhoto(true);
    setPhotoFileName("");
    setPhotoPreviewUrl(null);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];
  const hasPhoto = Boolean(photoPreviewUrl || photoFileName);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assinante"
        title={data.isEditMode ? "Conta do usuario" : "Adicionar usuario"}
        description={`Gerencie o cadastro do usuario vinculado a empresa ativa ${data.companyName}, mantendo perfil e status alinhados com a politica de acesso.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push("/assinante/gestao-acessos")}
            >
              Voltar
            </Button>

            {data.isCurrentUser ? (
              <Button
                icon={KeyRound}
                type="button"
                variant="outline"
                onClick={() => router.push("/alterar-senha")}
              >
                Alterar Senha
              </Button>
            ) : null}

            <Button form="managed-user-form" icon={Save} type="submit" disabled={!canSave}>
              Salvar
            </Button>

            {data.isEditMode ? (
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Deseja cancelar este usuario? O cadastro permanecera disponivel para futura reativacao.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="userId" value={data.user.id ?? ""} />
                <Button
                  icon={Trash2}
                  type="submit"
                  variant="outline"
                  className={deleteButtonClassName}
                  disabled={!canDelete}
                >
                  Excluir
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
          Seu perfil possui permissao apenas para visualizar esta conta. Alteracoes e
          exclusao permanecem bloqueadas.
        </AuthMessage>
      ) : null}

      {state.provisionalAccess ? (
        <AuthMessage tone="info">
          <div className="space-y-1">
            <p>Senha provisoria gerada com sucesso para o primeiro acesso.</p>
            <p>
              E-mail: <strong>{state.provisionalAccess.email}</strong>
            </p>
            <p>
              Senha provisoria: <strong>{state.provisionalAccess.temporaryPassword}</strong>
            </p>
            {state.createdUserId ? (
              <button
                type="button"
                className="text-[12px] font-semibold text-primary"
                onClick={() =>
                  router.push(`/assinante/gestao-acessos/usuarios/${state.createdUserId}`)
                }
              >
                Abrir conta do usuario criado
              </button>
            ) : null}
          </div>
        </AuthMessage>
      ) : null}

      <form id="managed-user-form" action={formAction} className="space-y-6">
        <input type="hidden" name="userId" value={data.user.id ?? ""} />
        <input type="hidden" name="removePhoto" value={removePhoto ? "true" : "false"} />

        <Card>
          <CardHeader>
            <CardTitle>Cadastro do usuario</CardTitle>
            <CardDescription>
              Dados principais da conta vinculada a empresa ativa, com senha provisoria
              obrigatoria no primeiro acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex aspect-square items-center justify-center rounded-card border border-dashed border-border bg-background/60 p-4">
                {photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreviewUrl}
                    alt="Foto do usuario"
                    className="max-h-full max-w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center text-xs text-muted-foreground">
                    <UserRound className="h-10 w-10 text-primary/70" />
                    <span>Nenhuma foto cadastrada</span>
                  </div>
                )}
              </div>

              <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
                Foto do usuario
                <div className="flex items-stretch gap-2">
                  <input
                    ref={photoInputRef}
                    name="photoFile"
                    type="file"
                    accept="image/*"
                    disabled={isReadOnly}
                    className="block min-w-0 flex-[1_1_auto] text-xs leading-[44px] text-transparent file:mr-0 file:h-11 file:w-full file:rounded-[6px] file:border-0 file:bg-primary/10 file:px-3 file:py-0 file:text-[12px] file:font-medium file:leading-[44px] file:text-primary"
                    onChange={(event) =>
                      handlePhotoFileChange(event.target.files?.[0] ?? null)
                    }
                  />

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isReadOnly || !hasPhoto}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background/60 p-0 text-red-700 transition-colors hover:text-red-800 disabled:text-red-300 dark:text-red-300 dark:hover:text-red-200 dark:disabled:text-red-900/30"
                    aria-label="Excluir foto do usuario"
                    title="Excluir foto do usuario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-6">
                <span className="text-xs font-medium text-foreground">Nome completo *</span>
                <Input
                  name="fullName"
                  value={formValues.fullName}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("fullName", event.target.value)}
                />
                {fieldError("fullName") ? (
                  <span className={fieldMessageClassName}>{fieldError("fullName")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Nome curto *</span>
                <Input
                  name="shortName"
                  value={formValues.shortName}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("shortName", event.target.value)}
                />
                {fieldError("shortName") ? (
                  <span className={fieldMessageClassName}>{fieldError("shortName")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Status *</span>
                <select
                  name="status"
                  className={selectClassName}
                  value={formValues.status}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateField("status", event.target.value as typeof formValues.status)
                  }
                >
                  {userStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldError("status") ? (
                  <span className={fieldMessageClassName}>{fieldError("status")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Funcao</span>
                <Input
                  name="jobTitle"
                  value={formValues.jobTitle}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("jobTitle", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Departamento</span>
                <Input
                  name="department"
                  value={formValues.department}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("department", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Perfil de acesso *</span>
                <select
                  name="accessProfileId"
                  className={selectClassName}
                  value={formValues.accessProfileId}
                  disabled={isReadOnly}
                  onChange={(event) => updateField("accessProfileId", event.target.value)}
                >
                  <option value="">Selecione um perfil</option>
                  {data.profileOptions.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} - {accessProfileTierLabels[profile.tier]}
                    </option>
                  ))}
                </select>
                {fieldError("accessProfileId") ? (
                  <span className={fieldMessageClassName}>
                    {fieldError("accessProfileId")}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
                <span className="text-xs font-medium text-foreground">Telefone</span>
                <Input
                  name="phone"
                  value={formValues.phone}
                  disabled={isReadOnly}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                />
                {fieldError("phone") ? (
                  <span className={fieldMessageClassName}>{fieldError("phone")}</span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-6">
                <span className="text-xs font-medium text-foreground">E-mail *</span>
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
            </div>
          </CardContent>
        </Card>

        {data.isEditMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Visao rapida do acesso</CardTitle>
              <CardDescription>
                Status atual da conta do usuario e informacoes da ultima edicao realizada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[10px] border border-border/70 bg-background/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Status atual
                </p>
                <div className="mt-3">
                  <AuthMessage tone={getStatusTone(formValues.status)}>
                    {userStatusLabels[formValues.status]}
                  </AuthMessage>
                </div>
              </div>

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
                  Atualizado em
                </p>
                <p className="mt-3 text-xs font-semibold text-foreground">
                  {data.updatedAt || "Sem registro"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="px-6 py-6">
              <div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
                <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Ao salvar um novo usuario, o sistema gera automaticamente uma senha
                  provisoria e obriga a troca de senha no primeiro acesso.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}

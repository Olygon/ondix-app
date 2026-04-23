"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";

import {
  deleteAccessProfileAction,
  saveAccessProfileAction,
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
import { Textarea } from "@/components/ui/textarea";
import {
  accessProfileTierOptions,
  profileStatusOptions,
} from "@/lib/access-management/constants";
import {
  initialAccessProfileActionState,
  initialCollectionActionState,
} from "@/lib/access-management/form-state";
import { applyPermissionHierarchy } from "@/lib/access-management/permission-matrix";
import type {
  AccessProfileEditorPageData,
  PermissionMatrixRow,
} from "@/lib/access-management/types";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const checkboxClassName =
  "h-4 w-4 rounded border border-border text-primary focus:ring-2 focus:ring-primary/20";
const fieldMessageClassName = "text-xs font-semibold text-red-600 dark:text-red-300";
const deleteButtonClassName =
  "border-red-700/70 bg-red-700 font-semibold text-white hover:border-red-800 hover:bg-red-800 hover:text-white dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 dark:hover:text-white [&_svg]:stroke-[2.35]";

type AccessProfileEditorScreenProps = {
  data: AccessProfileEditorPageData;
};

export function AccessProfileEditorScreen({ data }: AccessProfileEditorScreenProps) {
  const router = useRouter();
  const [saveState, saveAction] = useActionState(
    saveAccessProfileAction,
    initialAccessProfileActionState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteAccessProfileAction,
    initialCollectionActionState,
  );
  const [formValues, setFormValues] = useState({
    description: data.profile.description,
    name: data.profile.name,
    status: data.profile.status,
    tier: data.profile.tier,
  });
  const [permissionRows, setPermissionRows] = useState(() =>
    applyPermissionHierarchy(data.permissionMatrix),
  );
  const canSave = data.profile.id
    ? data.access.accessProfileEditor.canEdit
    : data.access.accessProfileEditor.canAdd;
  const canDelete = data.access.accessProfileEditor.canDelete && data.canDelete;
  const isReadOnly = !canSave;
  const isProfileMetadataLocked = data.profile.isProtected || isReadOnly;

  useEffect(() => {
    setFormValues({
      description: data.profile.description,
      name: data.profile.name,
      status: data.profile.status,
      tier: data.profile.tier,
    });
    setPermissionRows(applyPermissionHierarchy(data.permissionMatrix));
  }, [
    data.permissionMatrix,
    data.profile.description,
    data.profile.name,
    data.profile.status,
    data.profile.tier,
    data.profile.updatedAtKey,
  ]);

  useEffect(() => {
    if (saveState.status !== "success") {
      return;
    }

    if (!data.profile.id && saveState.savedProfileId) {
      router.replace(`/assinante/gestao-acessos/perfis/${saveState.savedProfileId}`);
      return;
    }

    router.refresh();
  }, [data.profile.id, router, saveState.savedProfileId, saveState.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      router.push("/assinante/gestao-acessos/perfis");
    }
  }, [deleteState.status, router]);

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePermissionRow(
    rowCode: PermissionMatrixRow["code"],
    field: "allowed" | "canView" | "canEdit" | "canCreate" | "canDelete",
    value: boolean,
  ) {
    setPermissionRows((current) =>
      applyPermissionHierarchy(
        current.map((row) => {
          if (row.code !== rowCode) {
            return row;
          }

          if (field === "allowed") {
            if (!value) {
              return {
                ...row,
                canCreate: false,
                canDelete: false,
                canEdit: false,
                canView: false,
              };
            }

            return {
              ...row,
              canView: row.canView || (!row.canEdit && !row.canCreate && !row.canDelete),
            };
          }

          return {
            ...row,
            [field]: value,
          };
        }),
      ),
    );
  }

  const permissionsJson = useMemo(
    () =>
      JSON.stringify(
        permissionRows.map((row) => ({
          canCreate: row.canCreate,
          canDelete: row.canDelete,
          canEdit: row.canEdit,
          canView: row.canView,
          code: row.code,
          id: row.id,
        })),
      ),
    [permissionRows],
  );
  const permissionRowsByCode = useMemo(
    () => new Map(permissionRows.map((row) => [row.code, row])),
    [permissionRows],
  );
  const fieldError = (name: string) => saveState.fieldErrors?.[name]?.[0];

  function getRowDepth(row: PermissionMatrixRow) {
    let depth = 0;
    let parentCode = row.parentCode;

    while (parentCode) {
      depth += 1;
      parentCode = permissionRowsByCode.get(parentCode)?.parentCode;
    }

    return depth;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assinante"
        title={data.profile.id ? "Perfil de acesso" : "Adicionar perfil de acesso"}
        description={`Estruture o perfil da empresa ativa ${data.companyName} e configure a matriz de paginas e permissoes disponiveis para o nivel selecionado.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={ArrowLeft}
              type="button"
              variant="outline"
              onClick={() => router.push("/assinante/gestao-acessos/perfis")}
            >
              Voltar
            </Button>

            <Button form="access-profile-form" icon={Save} type="submit" disabled={!canSave}>
              Salvar
            </Button>

            {data.profile.id ? (
              <form
                action={deleteAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Deseja excluir este perfil? As permissoes vinculadas serao removidas junto com ele.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="profileId" value={data.profile.id} />
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

      {saveState.status === "success" && saveState.message ? (
        <AuthMessage tone="success">{saveState.message}</AuthMessage>
      ) : null}

      {saveState.status === "error" && saveState.message ? (
        <AuthMessage tone="error">{saveState.message}</AuthMessage>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <AuthMessage tone="error">{deleteState.message}</AuthMessage>
      ) : null}

      {isReadOnly ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao apenas para visualizar este perfil de acesso. A
          matriz e os dados cadastrais permanecem bloqueados para edicao.
        </AuthMessage>
      ) : null}

      <form id="access-profile-form" action={saveAction} className="space-y-6">
        <input type="hidden" name="profileId" value={data.profile.id ?? ""} />
        <input type="hidden" name="permissionsJson" value={permissionsJson} />
        {isProfileMetadataLocked ? (
          <>
            <input type="hidden" name="name" value={formValues.name} />
            <input type="hidden" name="tier" value={formValues.tier} />
            <input type="hidden" name="status" value={formValues.status} />
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Dados do perfil</CardTitle>
            <CardDescription>
              Configure os metadados principais do perfil, mantendo codigo, datas e
              auditoria visiveis para consulta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Codigo do perfil</span>
              <Input disabled value={data.profile.code} className="bg-background/60" />
            </label>

            <label className="flex flex-col gap-2 md:col-span-4 xl:col-span-4">
              <span className="text-xs font-medium text-foreground">Nome do perfil *</span>
              <Input
                name="name"
                value={formValues.name}
                disabled={isProfileMetadataLocked}
                onChange={(event) => updateField("name", event.target.value)}
              />
              {fieldError("name") ? (
                <span className={fieldMessageClassName}>{fieldError("name")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">Nivel do perfil *</span>
              <select
                name="tier"
                className={selectClassName}
                value={formValues.tier}
                disabled={isProfileMetadataLocked}
                onChange={(event) => updateField("tier", event.target.value)}
              >
                {accessProfileTierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldError("tier") ? (
                <span className={fieldMessageClassName}>{fieldError("tier")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">Status *</span>
              <select
                name="status"
                className={selectClassName}
                value={formValues.status}
                disabled={isProfileMetadataLocked}
                onChange={(event) => updateField("status", event.target.value)}
              >
                {profileStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldError("status") ? (
                <span className={fieldMessageClassName}>{fieldError("status")}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 md:col-span-6 xl:col-span-6">
              <span className="text-xs font-medium text-foreground">Descricao</span>
              <Textarea
                name="description"
                value={formValues.description}
                disabled={isReadOnly}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Nativo</span>
              <Input
                disabled
                value={data.profile.isNative ? "Sim" : "Nao"}
                className="bg-background/60"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Data da criacao</span>
              <Input disabled value={data.profile.createdAt} className="bg-background/60" />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Data da alteracao</span>
              <Input disabled value={data.profile.updatedAt} className="bg-background/60" />
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">Criado por</span>
              <Input
                disabled
                value={data.profile.createdByName}
                className="bg-background/60"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-3 xl:col-span-3">
              <span className="text-xs font-medium text-foreground">Alterado por</span>
              <Input
                disabled
                value={data.profile.updatedByName}
                className="bg-background/60"
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Matriz de permissoes</CardTitle>
              <CardDescription>
                Marque o acesso permitido e as permissoes derivadas de visualizar, editar,
                adicionar e excluir para cada pagina cadastrada.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                form="access-profile-form"
                icon={Save}
                type="submit"
                disabled={!canSave}
              >
                Salvar Matriz
              </Button>

              <Button
                icon={RefreshCw}
                type="button"
                variant="outline"
                onClick={() => router.refresh()}
              >
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="border-b border-border/80 px-3 py-3 font-semibold">Id da pagina</th>
                  <th className="border-b border-border/80 px-3 py-3 font-semibold">Modulo</th>
                  <th className="border-b border-border/80 px-3 py-3 font-semibold">Hierarquia pai</th>
                  <th className="border-b border-border/80 px-3 py-3 font-semibold">Nome da pagina</th>
                  <th className="border-b border-border/80 px-3 py-3 text-center font-semibold">Acesso permitido</th>
                  <th className="border-b border-border/80 px-3 py-3 text-center font-semibold">Visualizar</th>
                  <th className="border-b border-border/80 px-3 py-3 text-center font-semibold">Editar</th>
                  <th className="border-b border-border/80 px-3 py-3 text-center font-semibold">Adicionar</th>
                  <th className="border-b border-border/80 px-3 py-3 text-center font-semibold">Excluir</th>
                </tr>
              </thead>
              <tbody>
                {permissionRows.map((row) => {
                  const isAllowed = row.canView || row.canEdit || row.canCreate || row.canDelete;
                  const parentRow = row.parentCode
                    ? permissionRowsByCode.get(row.parentCode)
                    : undefined;
                  const rowDepth = getRowDepth(row);
                  const canAllowRow = !parentRow || parentRow.canView;
                  const canToggleEdit = !parentRow || parentRow.canEdit;
                  const canToggleCreate = !parentRow || parentRow.canCreate;
                  const canToggleDelete = !parentRow || parentRow.canDelete;

                  return (
                    <tr key={row.code} className="text-xs text-foreground">
                      <td className="border-b border-border/60 px-3 py-3 align-top font-medium">
                        {row.code}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                        {row.module}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                        {row.parentName || "-"}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <div
                          className="flex flex-col gap-1"
                          style={{ paddingLeft: `${rowDepth * 18}px` }}
                        >
                          <span className="font-medium text-foreground">{row.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {row.route || "Sem rota publica"}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 text-center align-top">
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={isAllowed}
                          disabled={isReadOnly || !canAllowRow}
                          onChange={(event) =>
                            updatePermissionRow(row.code, "allowed", event.target.checked)
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 text-center align-top">
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={row.canView}
                          disabled={isReadOnly || !isAllowed || !canAllowRow}
                          onChange={(event) =>
                            updatePermissionRow(row.code, "canView", event.target.checked)
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 text-center align-top">
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={row.canEdit}
                          disabled={isReadOnly || !isAllowed || !canToggleEdit}
                          onChange={(event) =>
                            updatePermissionRow(row.code, "canEdit", event.target.checked)
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 text-center align-top">
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={row.canCreate}
                          disabled={isReadOnly || !isAllowed || !canToggleCreate}
                          onChange={(event) =>
                            updatePermissionRow(row.code, "canCreate", event.target.checked)
                          }
                        />
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 text-center align-top">
                        <input
                          type="checkbox"
                          className={checkboxClassName}
                          checked={row.canDelete}
                          disabled={isReadOnly || !isAllowed || !canToggleDelete}
                          onChange={(event) =>
                            updatePermissionRow(row.code, "canDelete", event.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-6 py-6">
            <div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                {data.profile.isProtected
                  ? `O perfil ${data.profile.name} e nativo do sistema e permanece protegido contra exclusao.`
                  : `Os checks de permissao seguem hierarquia automatica: excluir marca todas as demais; adicionar marca editar e visualizar; editar marca visualizar.`}
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

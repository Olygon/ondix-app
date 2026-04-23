"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PencilLine, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { deleteAccessProfileAction } from "@/app/(authenticated)/assinante/gestao-acessos/actions";
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
import {
  accessProfileTierLabels,
  getStatusTone,
  profileStatusLabels,
} from "@/lib/access-management/constants";
import { initialCollectionActionState } from "@/lib/access-management/form-state";
import type { AccessProfileListPageData } from "@/lib/access-management/types";

const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type AccessProfileListScreenProps = {
  data: AccessProfileListPageData;
};

export function AccessProfileListScreen({ data }: AccessProfileListScreenProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    deleteAccessProfileAction,
    initialCollectionActionState,
  );
  const canOpenProfile = data.access.accessProfileEditor.canView;
  const canEditProfile = data.access.accessProfileEditor.canEdit;
  const canDeleteProfile = data.access.accessProfileEditor.canDelete;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assinante"
        title="Lista de perfis de acesso"
        description={`Gerencie os perfis disponiveis para a empresa ativa ${data.companyName}, incluindo niveis, status e a disponibilidade para vinculacao de usuarios.`}
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

            {data.access.accessProfileEditor.canAdd ? (
              <Button
                icon={Plus}
                type="button"
                onClick={() => router.push("/assinante/gestao-acessos/perfis/novo")}
              >
                Adicionar
              </Button>
            ) : null}

            {data.access.accessManagement.canView ? (
              <Button
                icon={ShieldCheck}
                type="button"
                variant="outline"
                onClick={() => router.push("/assinante/gestao-acessos")}
              >
                Lista de Usuarios
              </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Perfis configurados</CardTitle>
          <CardDescription>
            Apenas perfis sem usuarios vinculados podem ser excluidos. O perfil
            Administrador permanece como base nativa do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.profiles.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center text-xs text-muted-foreground">
              Nenhum perfil disponivel para a empresa ativa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Codigo</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Nome do perfil</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Nivel</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Status</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Data da criacao</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Data da alteracao</th>
                    <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.profiles.map((profile) => {
                    const isDeleteDisabled =
                      !canDeleteProfile ||
                      profile.isNative ||
                      profile.isProtected ||
                      profile.linkedUsersCount > 0;

                    return (
                      <tr key={profile.id} className="text-xs text-foreground">
                        <td className="border-b border-border/60 px-3 py-3 align-top font-semibold">
                          {profile.code}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-top">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {profile.name}
                              </span>
                              {profile.isNative ? (
                                <StatusBadge label="Nativo" tone="info" />
                              ) : null}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Usuarios vinculados: {profile.linkedUsersCount}
                            </p>
                          </div>
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                          {accessProfileTierLabels[profile.tier]}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-top">
                          <StatusBadge
                            label={profileStatusLabels[profile.status]}
                            tone={getStatusTone(profile.status)}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                          {profile.createdAt}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                          {profile.updatedAt}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            {canOpenProfile ? (
                              <button
                                type="button"
                                className={actionIconClassName}
                                aria-label={`${canEditProfile ? "Editar" : "Visualizar"} ${profile.name}`}
                                title={canEditProfile ? "Editar perfil" : "Visualizar perfil"}
                                onClick={() =>
                                  router.push(`/assinante/gestao-acessos/perfis/${profile.id}`)
                                }
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                            ) : null}

                            <form
                              action={formAction}
                              onSubmit={(event) => {
                                if (
                                  !window.confirm(
                                    `Deseja excluir o perfil ${profile.name}? As permissoes vinculadas tambem serao removidas.`,
                                  )
                                ) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="profileId" value={profile.id} />
                              <button
                                type="submit"
                                className={deleteActionIconClassName}
                                aria-label={`Excluir ${profile.name}`}
                                title={
                                  isDeleteDisabled
                                    ? "Perfis nativos ou com usuarios vinculados nao podem ser excluidos"
                                    : "Excluir perfil"
                                }
                                disabled={isDeleteDisabled}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

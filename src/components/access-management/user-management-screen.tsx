"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PencilLine, Plus, ShieldCheck, Trash2, UsersRound } from "lucide-react";

import { cancelManagedUserAction } from "@/app/(authenticated)/assinante/gestao-acessos/actions";
import { AuthMessage } from "@/components/auth/auth-message";
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
import { getStatusTone, accessProfileTierLabels, userStatusLabels } from "@/lib/access-management/constants";
import {
  initialCollectionActionState,
} from "@/lib/access-management/form-state";
import type { UserManagementPageData } from "@/lib/access-management/types";

const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type UserManagementScreenProps = {
  data: UserManagementPageData;
};

export function UserManagementScreen({ data }: UserManagementScreenProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    cancelManagedUserAction,
    initialCollectionActionState,
  );
  const canOpenUser = data.access.userAccount.canView;
  const canEditUser = data.access.userAccount.canEdit;
  const canDeleteUser = data.access.userAccount.canDelete;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assinante"
        title="Gestao de acessos"
        description={`Gerencie os usuarios vinculados a empresa ativa ${data.companyName} e mantenha os perfis de acesso alinhados com a operacao.`}
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

            {data.access.userAccount.canAdd ? (
              <Button
                icon={Plus}
                type="button"
                onClick={() => router.push("/assinante/gestao-acessos/usuarios/novo")}
              >
                Adicionar
              </Button>
            ) : null}

            {data.access.accessProfiles.canView ? (
              <Button
                icon={ShieldCheck}
                type="button"
                variant="outline"
                onClick={() => router.push("/assinante/gestao-acessos/perfis")}
              >
                Lista de Perfis
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
          <CardTitle>Usuarios da empresa ativa</CardTitle>
          <CardDescription>
            Nome, funcao, departamento, perfil de acesso e ultimo acesso de cada usuario
            vinculado a empresa logada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.users.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center">
              <UsersRound className="h-10 w-10 text-primary/70" />
              <p className="mt-4 text-sm font-semibold text-foreground">
                Nenhum usuario cadastrado ainda.
              </p>
              <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
                Assim que voce adicionar o primeiro usuario vinculado a esta empresa, a
                listagem sera exibida aqui com os dados de funcao, departamento, perfil e
                ultimo acesso.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Nome do usuario</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Funcao</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Departamento</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Perfil de acesso</th>
                    <th className="border-b border-border/80 px-3 py-3 font-semibold">Ultimo acesso</th>
                    <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="text-xs text-foreground">
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{user.fullName}</span>
                            {user.isCurrentUser ? (
                              <StatusBadge label="Voce" tone="info" />
                            ) : null}
                            <StatusBadge
                              label={userStatusLabels[user.status]}
                              tone={getStatusTone(user.status)}
                            />
                          </div>
                          <p className="text-[12px] text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                        {user.jobTitle || "Nao informado"}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                        {user.department || "Nao informado"}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <span className="font-medium text-foreground">
                            {user.accessProfileName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {accessProfileTierLabels[user.accessProfileTier]}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top text-muted-foreground">
                        {user.lastLoginAt}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          {canOpenUser ? (
                            <button
                              type="button"
                              className={actionIconClassName}
                              aria-label={`${canEditUser ? "Editar" : "Visualizar"} ${user.fullName}`}
                              title={canEditUser ? "Editar usuario" : "Visualizar usuario"}
                              onClick={() =>
                                router.push(`/assinante/gestao-acessos/usuarios/${user.id}`)
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
                                  `Deseja cancelar o usuario ${user.fullName}? O cadastro permanecera disponivel para reativacao.`,
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="userId" value={user.id} />
                            <button
                              type="submit"
                              className={deleteActionIconClassName}
                              aria-label={`Excluir ${user.fullName}`}
                              title="Cancelar usuario"
                              disabled={!canDeleteUser || user.isCurrentUser}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
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
    </div>
  );
}

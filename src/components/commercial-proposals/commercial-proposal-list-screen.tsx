"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Ban,
  Eraser,
  FileDown,
  FileSignature,
  FileText,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  deleteCommercialProposalAction,
  generateContractFromCommercialProposalAction,
  inactivateCommercialProposalAction,
} from "@/app/(authenticated)/comercial/proposta-comercial/actions";
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
import { ListPagination } from "@/components/ui/list-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  commercialProposalBaseRoute,
  commercialProposalStatusLabels,
  commercialProposalStatusOptions,
  commercialProposalStatusTones,
  type CommercialProposalSortField,
} from "@/lib/commercial-proposals/constants";
import {
  initialCommercialProposalCollectionActionState,
} from "@/lib/commercial-proposals/form-state";
import type {
  CommercialProposalListFilters,
  CommercialProposalListPageData,
} from "@/lib/commercial-proposals/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type CommercialProposalListScreenProps = {
  data: CommercialProposalListPageData;
};

function EmptyProposalsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center">
      <FileText className="h-10 w-10 text-primary/70" />
      <p className="mt-4 text-sm font-semibold text-foreground">
        Nenhuma proposta comercial cadastrada ainda.
      </p>
      <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        Crie propostas a partir dos clientes e servicos cadastrados para
        controlar negociacoes, aprovacoes e futura conversao em contrato.
      </p>
    </div>
  );
}

function SortHeader({
  activeSort,
  direction,
  label,
  onSort,
  sort,
}: {
  activeSort: CommercialProposalSortField;
  direction: "asc" | "desc";
  label: string;
  onSort: (sort: CommercialProposalSortField) => void;
  sort: CommercialProposalSortField;
}) {
  const isActive = activeSort === sort;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 text-left font-semibold transition-colors hover:text-primary",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() => onSort(sort)}
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3.5 w-3.5" />
      <span className="sr-only">
        Ordenar {label} {isActive && direction === "asc" ? "decrescente" : "crescente"}
      </span>
    </button>
  );
}

export function CommercialProposalListScreen({
  data,
}: CommercialProposalListScreenProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CommercialProposalListFilters>(
    data.filters,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const [inactivateState, inactivateAction, isInactivating] = useActionState(
    inactivateCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const [contractState, contractAction, isGeneratingContract] = useActionState(
    generateContractFromCommercialProposalAction,
    initialCommercialProposalCollectionActionState,
  );
  const canAdd = data.access.proposals.canAdd;
  const canOpen = data.access.proposals.canView;
  const canEdit = data.access.proposals.canEdit;
  const canDelete = data.access.proposals.canDelete;

  useEffect(() => {
    if (
      deleteState.status === "success" ||
      inactivateState.status === "success" ||
      contractState.status === "success"
    ) {
      router.refresh();
    }
  }, [contractState.status, deleteState.status, inactivateState.status, router]);

  function updateFilter<K extends keyof CommercialProposalListFilters>(
    name: K,
    value: CommercialProposalListFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function pushSearch(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(window.location.search);

    Object.entries(overrides).forEach(([key, value]) => {
      const normalized = String(value ?? "").trim();

      if (normalized) {
        params.set(key, normalized);
      } else {
        params.delete(key);
      }
    });

    const query = params.toString();

    router.push(query ? `${commercialProposalBaseRoute}?${query}` : commercialProposalBaseRoute);
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushSearch({
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
      customerId: filters.customerId,
      page: 1,
      search: filters.search,
      status: filters.status,
    });
  }

  function handleClearFilters() {
    setFilters({
      createdFrom: "",
      createdTo: "",
      customerId: "",
      direction: "desc",
      page: 1,
      search: "",
      sort: "createdAt",
      status: "",
    });
    router.push(commercialProposalBaseRoute);
  }

  function handleSort(sort: CommercialProposalSortField) {
    const nextDirection =
      data.filters.sort === sort && data.filters.direction === "asc" ? "desc" : "asc";

    pushSearch({
      direction: nextDirection,
      page: 1,
      sort,
    });
  }

  function handlePageChange(page: number) {
    pushSearch({ page });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Propostas Comerciais"
        description="Gerencie orcamentos e propostas de venda"
        actions={
          <Button
            icon={Plus}
            type="button"
            disabled={!canAdd}
            title={canAdd ? "Adicionar proposta" : "Sem permissao para adicionar propostas"}
            onClick={() => router.push(`${commercialProposalBaseRoute}/novo`)}
          >
            Adicionar
          </Button>
        }
      />

      {[deleteState, inactivateState, contractState].map((state, index) =>
        state.status !== "idle" && state.message ? (
          <AuthMessage key={`${state.status}-${index}`} tone={state.status === "success" ? "success" : "error"}>
            {state.message}
          </AuthMessage>
        ) : null,
      )}

      {!canAdd && !canEdit && !canDelete ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao apenas para visualizar propostas comerciais.
        </AuthMessage>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros de propostas</CardTitle>
          <CardDescription>
            Refine por cliente, status, periodo de criacao ou busque por codigo
            e nome do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
            onSubmit={handleFilterSubmit}
          >
            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Cliente</span>
              <select
                className={selectClassName}
                value={filters.customerId}
                onChange={(event) => updateFilter("customerId", event.target.value)}
              >
                <option value="">Todos</option>
                {data.customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Status</span>
              <select
                className={selectClassName}
                value={filters.status}
                onChange={(event) =>
                  updateFilter(
                    "status",
                    event.target.value as CommercialProposalListFilters["status"],
                  )
                }
              >
                <option value="">Todos</option>
                {commercialProposalStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Criado de</span>
              <Input
                type="date"
                value={filters.createdFrom}
                onChange={(event) => updateFilter("createdFrom", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Criado ate</span>
              <Input
                type="date"
                value={filters.createdTo}
                onChange={(event) => updateFilter("createdTo", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Busca</span>
              <Input
                value={filters.search}
                placeholder="Codigo ou nome do cliente"
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>

            <div className="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-4">
              <Button icon={Search} type="submit">
                Filtrar
              </Button>
              <Button
                icon={Eraser}
                type="button"
                variant="outline"
                onClick={handleClearFilters}
              >
                Limpar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Listagem de propostas</CardTitle>
              <CardDescription>
                Propostas filtradas pela empresa ativa, com permissao aplicada
                por perfil de acesso.
              </CardDescription>
            </div>
            <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {data.pagination.totalItems} proposta
                {data.pagination.totalItems === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.proposals.length === 0 ? (
            <EmptyProposalsState />
          ) : (
            <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader activeSort={data.filters.sort} direction={data.filters.direction} label="Codigo" sort="code" onSort={handleSort} />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader activeSort={data.filters.sort} direction={data.filters.direction} label="Cliente" sort="customer" onSort={handleSort} />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader activeSort={data.filters.sort} direction={data.filters.direction} label="Criacao" sort="createdAt" onSort={handleSort} />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader activeSort={data.filters.sort} direction={data.filters.direction} label="Validade" sort="validUntil" onSort={handleSort} />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader activeSort={data.filters.sort} direction={data.filters.direction} label="Valor total" sort="totalAmount" onSort={handleSort} />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader activeSort={data.filters.sort} direction={data.filters.direction} label="Status" sort="status" onSort={handleSort} />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.proposals.map((proposal) => {
                      const isContracted = proposal.status === "CONTRACTED" || Boolean(proposal.contractId);

                      return (
                        <tr
                          key={proposal.id}
                          className={cn(
                            "text-xs text-foreground transition-colors hover:bg-primary/5",
                            canOpen && "cursor-pointer",
                          )}
                          onClick={() => {
                            if (canOpen) {
                              router.push(`${commercialProposalBaseRoute}/${proposal.id}`);
                            }
                          }}
                        >
                          <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                            {proposal.code}
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 align-middle">
                            <span className="font-semibold text-foreground">{proposal.customerName}</span>
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                            {proposal.createdAt}
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                            {proposal.validUntil}
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                            {proposal.totalAmount}
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 align-middle">
                            <StatusBadge
                              label={commercialProposalStatusLabels[proposal.status]}
                              tone={commercialProposalStatusTones[proposal.status]}
                            />
                          </td>
                          <td className="border-b border-border/60 px-3 py-3 align-middle">
                            <div className="flex justify-end gap-2">
                              {canOpen ? (
                                <button
                                  type="button"
                                  className={actionIconClassName}
                                  aria-label={`Editar proposta ${proposal.code}`}
                                  title="Editar/visualizar proposta"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(`${commercialProposalBaseRoute}/${proposal.id}`);
                                  }}
                                >
                                  <PencilLine className="h-4 w-4" />
                                </button>
                              ) : null}

                              {canOpen ? (
                                <button
                                  type="button"
                                  className={actionIconClassName}
                                  aria-label={`Gerar PDF da proposta ${proposal.code}`}
                                  title="Gerar PDF"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    window.open(`${commercialProposalBaseRoute}/${proposal.id}/pdf`, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <FileDown className="h-4 w-4" />
                                </button>
                              ) : null}

                              {canEdit && proposal.status === "APPROVED" && !proposal.contractId ? (
                                <form
                                  action={contractAction}
                                  onSubmit={(event) => {
                                    event.stopPropagation();
                                    if (!window.confirm("Gerar contrato a partir desta proposta aprovada?")) {
                                      event.preventDefault();
                                    }
                                  }}
                                >
                                  <input type="hidden" name="proposalId" value={proposal.id} />
                                  <button
                                    type="submit"
                                    className={actionIconClassName}
                                    aria-label={`Gerar contrato da proposta ${proposal.code}`}
                                    title="Gerar contrato"
                                    disabled={isGeneratingContract}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <FileSignature className="h-4 w-4" />
                                  </button>
                                </form>
                              ) : null}

                              {canEdit && !isContracted ? (
                                <form
                                  action={inactivateAction}
                                  onSubmit={(event) => {
                                    event.stopPropagation();
                                    if (!window.confirm(`Deseja inativar a proposta ${proposal.code}?`)) {
                                      event.preventDefault();
                                    }
                                  }}
                                >
                                  <input type="hidden" name="proposalId" value={proposal.id} />
                                  <button
                                    type="submit"
                                    className={actionIconClassName}
                                    aria-label={`Inativar proposta ${proposal.code}`}
                                    title="Inativar proposta"
                                    disabled={isInactivating}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </button>
                                </form>
                              ) : null}

                              {canDelete && !isContracted ? (
                                <form
                                  action={deleteAction}
                                  onSubmit={(event) => {
                                    event.stopPropagation();
                                    if (!window.confirm(`Deseja excluir a proposta ${proposal.code}? O registro sera preservado no historico.`)) {
                                      event.preventDefault();
                                    }
                                  }}
                                >
                                  <input type="hidden" name="proposalId" value={proposal.id} />
                                  <button
                                    type="submit"
                                    className={deleteActionIconClassName}
                                    aria-label={`Excluir proposta ${proposal.code}`}
                                    title="Excluir proposta"
                                    disabled={isDeleting}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ListPagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

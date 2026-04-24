"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpDown,
  Eraser,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { inactivateAuxiliaryCodeAction } from "@/features/services/actions";
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
import { ListPagination } from "@/components/ui/list-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  auxiliaryKindLabels,
  auxiliaryKindRoutes,
  entityStatusLabels,
  entityStatusOptions,
  entityStatusTones,
  type AuxiliaryCodeSortField,
} from "@/features/services/constants/service-constants";
import {
  initialServiceCollectionActionState,
} from "@/features/services/types/service-form-state";
import type {
  AuxiliaryCodeListFilters,
  AuxiliaryCodeListPageData,
} from "@/features/services/types/service-types";
import { cn } from "@/lib/helpers/cn";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type ServiceAuxiliaryListScreenProps = {
  data: AuxiliaryCodeListPageData;
};

function SortHeader({
  activeSort,
  direction,
  label,
  onSort,
  sort,
}: {
  activeSort: AuxiliaryCodeSortField;
  direction: "asc" | "desc";
  label: string;
  onSort: (sort: AuxiliaryCodeSortField) => void;
  sort: AuxiliaryCodeSortField;
}) {
  const isActive = activeSort === sort;
  const nextDirection = isActive && direction === "asc" ? "desc" : "asc";

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
        Ordenar {label} em ordem {nextDirection === "asc" ? "crescente" : "decrescente"}
      </span>
    </button>
  );
}

function BooleanFlag({ value }: { value?: boolean }) {
  return (
    <span className="text-muted-foreground">{value ? "Sim" : "Nao"}</span>
  );
}

export function ServiceAuxiliaryListScreen({
  data,
}: ServiceAuxiliaryListScreenProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<AuxiliaryCodeListFilters>(data.filters);
  const [state, formAction, isInactivating] = useActionState(
    inactivateAuxiliaryCodeAction,
    initialServiceCollectionActionState,
  );
  const route = auxiliaryKindRoutes[data.kind];
  const title = auxiliaryKindLabels[data.kind];
  const canAdd = data.access.services.canAdd;
  const canOpen = data.access.services.canView;
  const canDelete = data.access.services.canDelete;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  function updateFilter<K extends keyof AuxiliaryCodeListFilters>(
    name: K,
    value: AuxiliaryCodeListFilters[K],
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

    router.push(query ? `${route}?${query}` : route);
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushSearch({
      page: 1,
      search: filters.search,
      status: filters.status,
    });
  }

  function handleClearFilters() {
    setFilters({
      direction: "asc",
      page: 1,
      search: "",
      sort: "code",
      status: "",
    });
    router.push(route);
  }

  function handleSort(sort: AuxiliaryCodeSortField) {
    const nextDirection =
      data.filters.sort === sort && data.filters.direction === "asc" ? "desc" : "asc";

    pushSearch({
      direction: nextDirection,
      page: 1,
      sort,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadastros / Servicos"
        title={title}
        description="Gerencie a tabela auxiliar compartilhada do sistema."
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
            {canAdd ? (
              <Button
                icon={Plus}
                type="button"
                onClick={() => router.push(`${route}/novo`)}
              >
                Adicionar
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
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busque por codigo, descricao, categoria ou municipio quando
            aplicavel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_auto]"
            onSubmit={handleFilterSubmit}
          >
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Status</span>
              <select
                className={selectClassName}
                value={filters.status}
                onChange={(event) =>
                  updateFilter(
                    "status",
                    event.target.value as AuxiliaryCodeListFilters["status"],
                  )
                }
              >
                <option value="">Todos</option>
                {entityStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Busca</span>
              <Input
                value={filters.search}
                placeholder="Buscar codigo ou descricao"
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>

            <div className="flex flex-wrap items-end gap-3">
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
          <CardTitle>Lista dos Códigos de Tributação</CardTitle>
          <CardDescription>
            Tabela geral de tributação do ISS por município.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.rows.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center text-xs text-muted-foreground">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {data.kind === "municipalTax" ? (
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          Município
                        </th>
                      ) : null}
                      {data.kind === "municipalTax" ? (
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          UF
                        </th>
                      ) : null}
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label={data.kind === "municipalTax" ? "cTribMun" : "Código"}
                          sort="code"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="DESCRIÇÃO"
                          sort="description"
                          onSort={handleSort}
                        />
                      </th>
                      {data.kind !== "municipalTax" ? (
                        <th className="border-b border-border/80 px-3 py-3">
                          <SortHeader
                            activeSort={data.filters.sort}
                            direction={data.filters.direction}
                            label="Categoria"
                            sort="category"
                            onSort={handleSort}
                          />
                        </th>
                      ) : (
                        <th className="border-b border-border/80 px-3 py-3 font-semibold">
                          ALÍQUOTA DE ISS
                        </th>
                      )}
                      {data.kind === "law116" ? (
                        <>
                          <th className="border-b border-border/80 px-3 py-3 font-semibold">Obra</th>
                          <th className="border-b border-border/80 px-3 py-3 font-semibold">Evento</th>
                          <th className="border-b border-border/80 px-3 py-3 font-semibold">Imovel</th>
                        </>
                      ) : null}
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="STATUS"
                          sort="status"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "text-xs text-foreground transition-colors hover:bg-primary/5",
                          canOpen && "cursor-pointer",
                        )}
                        onClick={() => {
                          if (canOpen) {
                            router.push(`${route}/${row.id}`);
                          }
                        }}
                      >

                        {data.kind === "municipalTax" ? (
                          <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                            {row.municipalityName || "-"}
                          </td>
                        ) : null}
                        {data.kind === "municipalTax" ? (
                          <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                            {row.stateCode || "-"}
                          </td>
                        ) : null}
                        <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                          {row.code}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {row.description}
                        </td>
                        {data.kind !== "municipalTax" ? (
                          <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                            {row.category || "-"}
                          </td>
                        ) : (
                          <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                            {row.defaultIssRate}
                          </td>
                        )}
                        {data.kind === "law116" ? (
                          <>
                            <td className="border-b border-border/60 px-3 py-3 align-middle">
                              <BooleanFlag value={row.requiresConstruction} />
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle">
                              <BooleanFlag value={row.requiresEvent} />
                            </td>
                            <td className="border-b border-border/60 px-3 py-3 align-middle">
                              <BooleanFlag value={row.requiresProperty} />
                            </td>
                          </>
                        ) : null}
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <StatusBadge
                            label={entityStatusLabels[row.status]}
                            tone={entityStatusTones[row.status]}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={actionIconClassName}
                              aria-label={`Editar ${row.code}`}
                              title="Editar"
                              disabled={!canOpen}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`${route}/${row.id}`);
                              }}
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <form
                              action={formAction}
                              onSubmit={(event) => {
                                event.stopPropagation();
                                if (!window.confirm("Deseja inativar este registro?")) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="kind" value={data.kind} />
                              <input type="hidden" name="auxiliaryCodeId" value={row.id} />
                              <button
                                type="submit"
                                className={deleteActionIconClassName}
                                aria-label={`Inativar ${row.code}`}
                                title="Inativar"
                                disabled={!canDelete || isInactivating}
                                onClick={(event) => event.stopPropagation()}
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

              <ListPagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={(page) => pushSearch({ page })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpDown,
  BookOpenText,
  Eraser,
  FileCode2,
  Landmark,
  PencilLine,
  Plus,
  Search,
  Settings2,
} from "lucide-react";

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
  auxiliaryKindRoutes,
  providedServiceStatusLabels,
  providedServiceStatusOptions,
  providedServiceStatusTones,
  type ProvidedServiceSortField,
} from "@/lib/services/constants";
import type {
  ProvidedServiceListFilters,
  ProvidedServiceListPageData,
} from "@/lib/services/types";
import { cn } from "@/lib/helpers/cn";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";

type ServiceListScreenProps = {
  data: ProvidedServiceListPageData;
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center">
      <FileCode2 className="h-10 w-10 text-primary/70" />
      <p className="mt-4 text-sm font-semibold text-foreground">
        Nenhum servico cadastrado ainda.
      </p>
      <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        Cadastre servicos prestados para propostas, contratos, faturamento e
        futura emissao de NFS-e.
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
  activeSort: ProvidedServiceSortField;
  direction: "asc" | "desc";
  label: string;
  onSort: (sort: ProvidedServiceSortField) => void;
  sort: ProvidedServiceSortField;
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

export function ServiceListScreen({ data }: ServiceListScreenProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ProvidedServiceListFilters>(data.filters);
  const canAdd = data.access.services.canAdd;
  const canOpen = data.access.services.canView;

  function updateFilter<K extends keyof ProvidedServiceListFilters>(
    name: K,
    value: ProvidedServiceListFilters[K],
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

    router.push(query ? `/crm/servicos?${query}` : "/crm/servicos");
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
    router.push("/crm/servicos");
  }

  function handleSort(sort: ProvidedServiceSortField) {
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
        eyebrow="Cadastros"
        title="Servicos"
        description="Gerencie os servicos cadastrados."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              icon={BookOpenText}
              type="button"
              variant="outline"
              onClick={() => router.push(auxiliaryKindRoutes.law116)}
            >
              Lei 116/03
            </Button>
            <Button
              icon={FileCode2}
              type="button"
              variant="outline"
              onClick={() => router.push(auxiliaryKindRoutes.nbs)}
            >
              NBS
            </Button>
            <Button
              icon={Landmark}
              type="button"
              variant="outline"
              onClick={() => router.push(auxiliaryKindRoutes.municipalTax)}
            >
              Tributação
            </Button>
            {canAdd ? (
              <Button
                icon={Plus}
                type="button"
                onClick={() => router.push("/crm/servicos/novo")}
              >
                Adicionar
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros de servicos</CardTitle>
          <CardDescription>
            Refine a listagem por status ou busque por nome e descricao.
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
                    event.target.value as ProvidedServiceListFilters["status"],
                  )
                }
              >
                <option value="">Todos</option>
                {providedServiceStatusOptions.map((option) => (
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
                placeholder="Buscar por nome ou descricao"
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
          <CardTitle>Listagem de servicos</CardTitle>
          <CardDescription>
            Servicos filtrados pela empresa ativa, preparados para proposta,
            contrato, faturamento e NFS-e.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.services.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Codigo"
                          sort="code"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Nome/descricao"
                          sort="name"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Lei 116"
                          sort="law116"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="NBS"
                          sort="nbs"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Custo"
                          sort="costAmount"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Preco"
                          sort="priceAmount"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Margem"
                          sort="profitMarginPercent"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Status"
                          sort="status"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3 text-right font-semibold">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.services.map((service) => (
                      <tr
                        key={service.id}
                        className={cn(
                          "text-xs text-foreground transition-colors hover:bg-primary/5",
                          canOpen && "cursor-pointer",
                        )}
                        onClick={() => {
                          if (canOpen) {
                            router.push(`/crm/servicos/${service.id}`);
                          }
                        }}
                      >
                        <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                          {service.code}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground">
                              {service.name}
                            </span>
                            <span className="max-w-[360px] truncate text-muted-foreground">
                              {service.description}
                            </span>
                          </div>
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {service.law116}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {service.nbs}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                          {service.costAmount}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                          {service.priceAmount}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {service.profitMarginPercent}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <StatusBadge
                            label={providedServiceStatusLabels[service.status]}
                            tone={providedServiceStatusTones[service.status]}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={actionIconClassName}
                              aria-label={`Editar ${service.name}`}
                              title="Editar servico"
                              disabled={!canOpen}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/crm/servicos/${service.id}`);
                              }}
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={actionIconClassName}
                              aria-label={`Configurar tributacao municipal de ${service.name}`}
                              title="Tributacao municipal"
                              disabled={!canOpen}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/crm/servicos/${service.id}#tributacao-municipal`);
                              }}
                            >
                              <Settings2 className="h-4 w-4" />
                            </button>
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
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

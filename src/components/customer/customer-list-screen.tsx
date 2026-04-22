"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eraser,
  PencilLine,
  Plus,
  Search,
  Trash2,
  UserRoundPlus,
  UsersRound,
  ArrowUpDown,
} from "lucide-react";

import { deleteCustomerAction } from "@/app/(authenticated)/crm/cliente/actions";
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
  customerStatusLabels,
  customerStatusOptions,
  customerStatusTones,
  customerTypeLabels,
  customerTypeOptions,
  type CustomerSortField,
} from "@/lib/customer/constants";
import { formatCpfCnpj } from "@/lib/customer/formatters";
import {
  initialCustomerCollectionActionState,
} from "@/lib/customer/form-state";
import type { CustomerListFilters, CustomerListPageData } from "@/lib/customer/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-11 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] text-foreground shadow-sm outline-none transition-colors duration-150 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const actionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45";
const deleteActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-red-700/70 bg-red-700 font-semibold text-white transition-colors hover:border-red-800 hover:bg-red-800 disabled:cursor-not-allowed disabled:border-red-300/60 disabled:bg-red-300/70 disabled:text-white/90 disabled:opacity-45 dark:border-red-500 dark:bg-red-500 dark:hover:border-red-400 dark:hover:bg-red-400 [&_svg]:stroke-[2.35]";

type CustomerListScreenProps = {
  data: CustomerListPageData;
};

function EmptyCustomersState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background/50 px-6 py-12 text-center">
      <UsersRound className="h-10 w-10 text-primary/70" />
      <p className="mt-4 text-sm font-semibold text-foreground">
        Nenhum cliente cadastrado ainda.
      </p>
      <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
        Assim que o primeiro cliente for cadastrado para a empresa ativa, ele
        aparecera aqui com documento, UF, contrato e status.
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
  activeSort: CustomerSortField;
  direction: "asc" | "desc";
  label: string;
  onSort: (sort: CustomerSortField) => void;
  sort: CustomerSortField;
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

export function CustomerListScreen({ data }: CustomerListScreenProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CustomerListFilters>(data.filters);
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCustomerAction,
    initialCustomerCollectionActionState,
  );
  const canAdd = data.access.customers.canAdd;
  const canOpen = data.access.customers.canView;
  const canDelete = data.access.customers.canDelete;

  useEffect(() => {
    if (deleteState.status === "success") {
      router.refresh();
    }
  }, [deleteState.status, router]);

  function updateFilter<K extends keyof CustomerListFilters>(
    name: K,
    value: CustomerListFilters[K],
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

    router.push(query ? `/crm/cliente?${query}` : "/crm/cliente");
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushSearch({
      contractDuePeriod: filters.contractDuePeriod,
      federalDocument: filters.federalDocument,
      name: filters.name,
      page: 1,
      plan: filters.plan,
      status: filters.status,
      type: filters.type,
    });
  }

  function handleClearFilters() {
    setFilters({
      contractDuePeriod: "",
      direction: "asc",
      federalDocument: "",
      name: "",
      page: 1,
      plan: "",
      sort: "code",
      status: "",
      type: "",
    });
    router.push("/crm/cliente");
  }

  function handleSort(sort: CustomerSortField) {
    const nextDirection =
      data.filters.sort === sort && data.filters.direction === "asc" ? "desc" : "asc";

    pushSearch({
      direction: nextDirection,
      page: 1,
      sort,
    });
  }

  function handlePageChange(page: number) {
    pushSearch({
      page,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM / Comercial"
        title="Clientes"
        description={`Gerencie os clientes cadastrados no sistema para a empresa ativa ${data.companyName}.`}
        actions={
          <Button
            icon={Plus}
            type="button"
            disabled={!canAdd}
            title={canAdd ? "icionar cliente" : "Sem permissao para adicionar clientes"}
            onClick={() => router.push("/crm/cliente/novo")}
          >
            Adicionar
          </Button>
        }
      />

      {deleteState.status === "success" && deleteState.message ? (
        <AuthMessage tone="success">{deleteState.message}</AuthMessage>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <AuthMessage tone="error">{deleteState.message}</AuthMessage>
      ) : null}

      {!canAdd && !data.access.customers.canEdit && !canDelete ? (
        <AuthMessage tone="info">
          Seu perfil possui permissao de visualizacao para clientes. Cadastro,
          edicao e exclusao ficam bloqueados.
        </AuthMessage>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros de clientes</CardTitle>
          <CardDescription>
            Refine a listagem por status, tipo, nome e CPF/CNPJ. Filtros
            contratuais ficam preparados para a futura integracao com contratos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
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
                    event.target.value as CustomerListFilters["status"],
                  )
                }
              >
                <option value="">Todos</option>
                {customerStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Tipo</span>
              <select
                className={selectClassName}
                value={filters.type}
                onChange={(event) =>
                  updateFilter("type", event.target.value as CustomerListFilters["type"])
                }
              >
                <option value="">Todos</option>
                {customerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">Nome</span>
              <Input
                value={filters.name}
                placeholder="Buscar por nome"
                onChange={(event) => updateFilter("name", event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 xl:col-span-2">
              <span className="text-xs font-medium text-foreground">CPF/CNPJ</span>
              <Input
                value={filters.federalDocument}
                placeholder="Buscar por CPF ou CNPJ"
                onChange={(event) =>
                  updateFilter("federalDocument", formatCpfCnpj(event.target.value))
                }
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Plano contratado</span>
              <select className={selectClassName} disabled value="">
                <option value="">Contrato em breve</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">
                Vencimento do contrato
              </span>
              <Input disabled value="Contrato em breve" />
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
              <CardTitle>Listagem de clientes</CardTitle>
              <CardDescription>
                Cadastros filtrados pela empresa ativa, com exclusao logica e
                permissao aplicada por perfil de acesso.
              </CardDescription>
            </div>
            <div className="rounded-[8px] border border-border bg-background/60 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {data.pagination.totalItems} cliente
                {data.pagination.totalItems === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.customers.length === 0 ? (
            <EmptyCustomersState />
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
                          label="Tipo"
                          sort="type"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="Nome"
                          sort="name"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="CNPJ/CPF"
                          sort="federalDocument"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3">
                        <SortHeader
                          activeSort={data.filters.sort}
                          direction={data.filters.direction}
                          label="UF"
                          sort="stateCode"
                          onSort={handleSort}
                        />
                      </th>
                      <th className="border-b border-border/80 px-3 py-3 font-semibold">
                        Numero do contrato
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
                    {data.customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="text-xs text-foreground transition-colors hover:bg-primary/5"
                      >
                        <td className="border-b border-border/60 px-3 py-3 align-middle font-semibold">
                          {customer.code}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {customerTypeLabels[customer.type]}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <UserRoundPlus className="h-4 w-4 text-primary/70" />
                            <span className="font-semibold text-foreground">
                              {customer.name}
                            </span>
                          </div>
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {customer.federalDocument}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {customer.stateCode}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle text-muted-foreground">
                          {customer.contractNumber}
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <StatusBadge
                            label={customerStatusLabels[customer.status]}
                            tone={customerStatusTones[customer.status]}
                          />
                        </td>
                        <td className="border-b border-border/60 px-3 py-3 align-middle">
                          <div className="flex justify-end gap-2">
                            {canOpen ? (
                              <button
                                type="button"
                                className={actionIconClassName}
                                aria-label={`Editar ${customer.name}`}
                                title="Editar cliente"
                                onClick={() => router.push(`/crm/cliente/${customer.id}`)}
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                            ) : null}

                            {canDelete ? (
                              <form
                                action={deleteAction}
                                onSubmit={(event) => {
                                  if (
                                    !window.confirm(
                                      `Deseja excluir o cliente ${customer.name}? O registro sera preservado no historico.`,
                                    )
                                  ) {
                                    event.preventDefault();
                                  }
                                }}
                              >
                                <input
                                  type="hidden"
                                  name="customerId"
                                  value={customer.id}
                                />
                                <button
                                  type="submit"
                                  className={deleteActionIconClassName}
                                  aria-label={`Excluir ${customer.name}`}
                                  title="Excluir cliente"
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </form>
                            ) : null}
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

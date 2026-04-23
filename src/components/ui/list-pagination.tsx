"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/helpers/cn";

type ListPaginationProps = {
  className?: string;
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
};

const paginationButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-45";

export function ListPagination({
  className,
  onPageChange,
  page,
  totalPages,
}: ListPaginationProps) {
  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= lastPage;

  return (
    <nav
      aria-label="Paginacao da listagem"
      className={cn(
        "flex flex-col gap-3 rounded-[10px] border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        Pagina {currentPage} de {lastPage}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={paginationButtonClassName}
          aria-label="Ir para primeira pagina"
          title="Primeira pagina"
          disabled={isFirstPage}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          className={paginationButtonClassName}
          aria-label="Ir para pagina anterior"
          title="Pagina anterior"
          disabled={isFirstPage}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          className={paginationButtonClassName}
          aria-label="Ir para proxima pagina"
          title="Proxima pagina"
          disabled={isLastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          className={paginationButtonClassName}
          aria-label="Ir para ultima pagina"
          title="Ultima pagina"
          disabled={isLastPage}
          onClick={() => onPageChange(lastPage)}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

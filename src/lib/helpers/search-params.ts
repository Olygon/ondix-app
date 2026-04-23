import type { SortDirection } from "@/types/pagination";
import type { SearchParams } from "@/types/search-params";

export function getSearchParamValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseSortDirection(value: string): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

import type { DecimalLike } from "@/lib/helpers/number";
import { toNumber } from "@/lib/helpers/number";

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCurrency(value?: DecimalLike | number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(toNumber(value));
}

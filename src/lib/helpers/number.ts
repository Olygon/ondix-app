export type DecimalLike = {
  toNumber?: () => number;
  toString: () => string;
};

export function normalizeDecimalInput(value?: string | null) {
  const normalized = value?.trim().replace(/\./g, "").replace(",", ".") ?? "";

  return normalized || "0";
}

export function toNumber(value?: DecimalLike | number | string | null) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber?.() ?? Number(value.toString());
}

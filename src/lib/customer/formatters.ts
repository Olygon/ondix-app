import {
  formatCnpj,
  onlyDigits,
} from "@/lib/company/formatters";

function getCustomerCodePrefix(companyName: string) {
  const normalizedName = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  return (normalizedName || "CLI").slice(0, 3).padEnd(3, "X");
}

export function formatCustomerCode(code: number, companyName: string) {
  return `${getCustomerCodePrefix(companyName)}${String(code).padStart(6, "0")}`;
}

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value);

  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

export function isValidCpf(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calcVerifier = (baseDigits: string, factor: number) => {
    let total = 0;
    let currentFactor = factor;

    for (const digit of baseDigits) {
      total += Number(digit) * currentFactor;
      currentFactor -= 1;
    }

    const remainder = (total * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  const firstVerifier = calcVerifier(digits.slice(0, 9), 10);
  const secondVerifier = calcVerifier(`${digits.slice(0, 9)}${firstVerifier}`, 11);

  return digits.endsWith(`${firstVerifier}${secondVerifier}`);
}

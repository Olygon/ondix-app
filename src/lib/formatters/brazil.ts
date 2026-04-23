export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatPostalCode(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}-${digits.slice(5)}`;
}

export function formatBrazilPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 3) {
    return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3)}`;
  }

  return `${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function formatDateBr(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatDateTimeBr(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function isValidCnpj(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calcVerifier = (baseDigits: string, factor: number) => {
    let total = 0;
    let currentFactor = factor;

    for (const digit of baseDigits) {
      total += Number(digit) * currentFactor;
      currentFactor = currentFactor === 2 ? 9 : currentFactor - 1;
    }

    const remainder = total % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstVerifier = calcVerifier(digits.slice(0, 12), 5);
  const secondVerifier = calcVerifier(`${digits.slice(0, 12)}${firstVerifier}`, 6);

  return digits.endsWith(`${firstVerifier}${secondVerifier}`);
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

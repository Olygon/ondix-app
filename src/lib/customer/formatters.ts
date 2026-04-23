export {
  formatCpf,
  formatCpfCnpj,
  isValidCpf,
} from "@/lib/formatters/brazil";

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

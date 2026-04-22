import { CustomerFormScreen } from "@/components/customer/customer-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getCustomerFormPageData } from "@/lib/customer/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "CRM / Comercial" },
  { label: "Clientes", href: "/crm/cliente" },
  { label: "Cadastro" },
];

export default async function NewCustomerPage() {
  const data = await getCustomerFormPageData();
  const screenKey = `new-${data.customer.code}`;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CustomerFormScreen key={screenKey} data={data} />
    </>
  );
}

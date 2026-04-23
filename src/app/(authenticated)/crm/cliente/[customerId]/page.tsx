import { CustomerFormScreen } from "@/features/customers/components/customer-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getCustomerFormPageData } from "@/lib/customer/service";

type CustomerEditPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerEditPage({ params }: CustomerEditPageProps) {
  const { customerId } = await params;
  const data = await getCustomerFormPageData(customerId);
  const screenKey = `${data.customer.id ?? "new"}-${data.updatedAt}`;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "CRM / Comercial" },
    { label: "Clientes", href: "/crm/cliente" },
    { label: data.customer.name || "Cadastro do cliente" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CustomerFormScreen key={screenKey} data={data} />
    </>
  );
}

import { CustomerCertificateManagementScreen } from "@/components/customer-certificates/customer-certificate-management-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getCustomerCertificatePageData } from "@/lib/customer-certificates/service";

type CustomerCertificatesPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerCertificatesPage({
  params,
}: CustomerCertificatesPageProps) {
  const { customerId } = await params;
  const data = await getCustomerCertificatePageData(customerId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "CRM / Comercial" },
    { label: "Clientes", href: "/crm/cliente" },
    { label: data.customer.name, href: `/crm/cliente/${data.customer.id}` },
    { label: "Certidoes Negativas" },
  ];
  const screenKey = `${data.customer.id}-${data.certificates.length}-${data.uploadLink?.id ?? "empty"}`;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CustomerCertificateManagementScreen key={screenKey} data={data} />
    </>
  );
}

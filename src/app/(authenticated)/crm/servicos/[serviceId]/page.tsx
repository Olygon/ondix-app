import { ServiceFormScreen } from "@/features/services/components/service-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getProvidedServiceFormPageData } from "@/lib/services/service";

type ServiceEditPageProps = {
  params: Promise<{
    serviceId: string;
  }>;
};

export default async function ServiceEditPage({ params }: ServiceEditPageProps) {
  const { serviceId } = await params;
  const data = await getProvidedServiceFormPageData(serviceId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Cadastros" },
    { label: "Servicos", href: "/crm/servicos" },
    { label: data.service.name || "Cadastro do servico" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceFormScreen
        key={`${data.service.id ?? "new"}-${data.updatedAt}-${data.taxRules.length}`}
        data={data}
      />
    </>
  );
}

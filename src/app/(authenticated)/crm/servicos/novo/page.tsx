import { ServiceFormScreen } from "@/features/services/components/service-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getProvidedServiceFormPageData } from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos", href: "/crm/servicos" },
  { label: "Novo servico" },
];

export default async function NewServicePage() {
  const data = await getProvidedServiceFormPageData();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceFormScreen key={`new-${data.service.code}`} data={data} />
    </>
  );
}

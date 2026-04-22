import { ServiceAuxiliaryFormScreen } from "@/components/services/service-auxiliary-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAuxiliaryCodeFormPageData } from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos", href: "/crm/servicos" },
  { label: "NBS", href: "/crm/servicos/nbs" },
  { label: "Novo codigo" },
];

export default async function NewNbsPage() {
  const data = await getAuxiliaryCodeFormPageData("nbs");

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryFormScreen key="new-nbs" data={data} />
    </>
  );
}

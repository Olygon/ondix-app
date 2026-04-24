import { ServiceAuxiliaryFormScreen } from "@/features/services/components/service-auxiliary-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAuxiliaryCodeFormPageData } from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos", href: "/crm/servicos" },
  { label: "Lei 116/03", href: "/crm/servicos/lei-116" },
  { label: "Novo codigo" },
];

export default async function NewLaw116Page() {
  const data = await getAuxiliaryCodeFormPageData("law116");

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryFormScreen key="new-law116" data={data} />
    </>
  );
}

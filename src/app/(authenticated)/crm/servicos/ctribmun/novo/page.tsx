import { ServiceAuxiliaryFormScreen } from "@/components/services/service-auxiliary-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAuxiliaryCodeFormPageData } from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos", href: "/crm/servicos" },
  { label: "cTribMun", href: "/crm/servicos/ctribmun" },
  { label: "Novo codigo" },
];

export default async function NewMunicipalTaxPage() {
  const data = await getAuxiliaryCodeFormPageData("municipalTax");

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryFormScreen key="new-ctribmun" data={data} />
    </>
  );
}

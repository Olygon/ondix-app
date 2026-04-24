import { ServiceAuxiliaryFormScreen } from "@/features/services/components/service-auxiliary-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAuxiliaryCodeFormPageData } from "@/lib/services/service";

type MunicipalTaxEditPageProps = {
  params: Promise<{
    codeId: string;
  }>;
};

export default async function MunicipalTaxEditPage({
  params,
}: MunicipalTaxEditPageProps) {
  const { codeId } = await params;
  const data = await getAuxiliaryCodeFormPageData("municipalTax", codeId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Cadastros" },
    { label: "Servicos", href: "/crm/servicos" },
    { label: "cTribMun", href: "/crm/servicos/ctribmun" },
    { label: data.auxiliaryCode.code || "Cadastro" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryFormScreen key={`${data.auxiliaryCode.id}`} data={data} />
    </>
  );
}

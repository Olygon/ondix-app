import { ServiceAuxiliaryFormScreen } from "@/components/services/service-auxiliary-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAuxiliaryCodeFormPageData } from "@/lib/services/service";

type Law116EditPageProps = {
  params: Promise<{
    codeId: string;
  }>;
};

export default async function Law116EditPage({ params }: Law116EditPageProps) {
  const { codeId } = await params;
  const data = await getAuxiliaryCodeFormPageData("law116", codeId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Cadastros" },
    { label: "Servicos", href: "/crm/servicos" },
    { label: "Lei 116/03", href: "/crm/servicos/lei-116" },
    { label: data.auxiliaryCode.code || "Cadastro" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryFormScreen key={`${data.auxiliaryCode.id}`} data={data} />
    </>
  );
}

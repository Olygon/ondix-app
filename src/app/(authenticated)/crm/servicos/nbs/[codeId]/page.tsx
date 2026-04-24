import { ServiceAuxiliaryFormScreen } from "@/features/services/components/service-auxiliary-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAuxiliaryCodeFormPageData } from "@/lib/services/service";

type NbsEditPageProps = {
  params: Promise<{
    codeId: string;
  }>;
};

export default async function NbsEditPage({ params }: NbsEditPageProps) {
  const { codeId } = await params;
  const data = await getAuxiliaryCodeFormPageData("nbs", codeId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Cadastros" },
    { label: "Servicos", href: "/crm/servicos" },
    { label: "NBS", href: "/crm/servicos/nbs" },
    { label: data.auxiliaryCode.code || "Cadastro" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryFormScreen key={`${data.auxiliaryCode.id}`} data={data} />
    </>
  );
}

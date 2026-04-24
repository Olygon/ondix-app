import { ServiceAuxiliaryListScreen } from "@/features/services/components/service-auxiliary-list-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import {
  getAuxiliaryCodeListPageData,
  type ServiceSearchParams,
} from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos", href: "/crm/servicos" },
  { label: "cTribMun" },
];

type MunicipalTaxPageProps = {
  searchParams: Promise<ServiceSearchParams>;
};

export default async function MunicipalTaxPage({
  searchParams,
}: MunicipalTaxPageProps) {
  const data = await getAuxiliaryCodeListPageData(
    "municipalTax",
    await searchParams,
  );

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryListScreen key={JSON.stringify(data.filters)} data={data} />
    </>
  );
}

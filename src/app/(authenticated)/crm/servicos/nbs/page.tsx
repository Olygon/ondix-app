import { ServiceAuxiliaryListScreen } from "@/components/services/service-auxiliary-list-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import {
  getAuxiliaryCodeListPageData,
  type ServiceSearchParams,
} from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos", href: "/crm/servicos" },
  { label: "NBS" },
];

type NbsPageProps = {
  searchParams: Promise<ServiceSearchParams>;
};

export default async function NbsPage({ searchParams }: NbsPageProps) {
  const data = await getAuxiliaryCodeListPageData("nbs", await searchParams);

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryListScreen key={JSON.stringify(data.filters)} data={data} />
    </>
  );
}

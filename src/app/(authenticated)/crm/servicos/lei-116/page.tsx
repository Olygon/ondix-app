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
  { label: "Lei 116/03" },
];

type Law116PageProps = {
  searchParams: Promise<ServiceSearchParams>;
};

export default async function Law116Page({ searchParams }: Law116PageProps) {
  const data = await getAuxiliaryCodeListPageData("law116", await searchParams);

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceAuxiliaryListScreen key={JSON.stringify(data.filters)} data={data} />
    </>
  );
}

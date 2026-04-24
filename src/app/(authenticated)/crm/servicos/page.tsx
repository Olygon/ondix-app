import { ServiceListScreen } from "@/features/services/components/service-list-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import {
  getProvidedServiceListPageData,
  type ServiceSearchParams,
} from "@/lib/services/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Cadastros" },
  { label: "Servicos" },
];

type ServicesPageProps = {
  searchParams: Promise<ServiceSearchParams>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const data = await getProvidedServiceListPageData(await searchParams);
  const screenKey = JSON.stringify(data.filters);

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <ServiceListScreen key={screenKey} data={data} />
    </>
  );
}

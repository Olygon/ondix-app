import { CustomerListScreen } from "@/features/customers/components/customer-list-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import {
  getCustomerListPageData,
  type CustomerSearchParams,
} from "@/lib/customer/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "CRM / Comercial" },
  { label: "Clientes" },
];

type CustomerListPageProps = {
  searchParams: Promise<CustomerSearchParams>;
};

export default async function CustomerListPage({
  searchParams,
}: CustomerListPageProps) {
  const data = await getCustomerListPageData(await searchParams);
  const screenKey = JSON.stringify(data.filters);

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CustomerListScreen key={screenKey} data={data} />
    </>
  );
}

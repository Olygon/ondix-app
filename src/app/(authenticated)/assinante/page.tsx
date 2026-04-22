import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { SubscriberCompanyScreen } from "@/components/subscriber/subscriber-company-screen";
import { getSubscriberCompanyPageData } from "@/lib/company/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Assinante" },
];

export default async function SubscriberCompanyPage() {
  const data = await getSubscriberCompanyPageData();
  const screenKey = `${data.company.lastEditedAt}:${data.company.logoFileName}:${data.company.contractCode}`;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <SubscriberCompanyScreen key={screenKey} data={data} />
    </>
  );
}

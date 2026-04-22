import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { SubscriptionManagementScreen } from "@/components/subscription/subscription-management-screen";
import { getSubscriptionManagementPageData } from "@/lib/subscription/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Assinante", href: "/assinante" },
  { label: "Gestao da Assinatura" },
];

export default async function SubscriberSubscriptionManagementPage() {
  const data = await getSubscriptionManagementPageData();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <SubscriptionManagementScreen data={data} />
    </>
  );
}

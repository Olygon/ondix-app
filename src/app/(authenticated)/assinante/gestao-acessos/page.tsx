import { UserManagementScreen } from "@/components/access-management/user-management-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getUserManagementPageData } from "@/lib/access-management/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Assinante", href: "/assinante" },
  { label: "Gestao de Acessos" },
];

export default async function SubscriberAccessManagementPage() {
  const data = await getUserManagementPageData();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <UserManagementScreen data={data} />
    </>
  );
}

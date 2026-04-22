import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { UserAccountScreen } from "@/components/access-management/user-account-screen";
import { getUserAccountPageData } from "@/lib/access-management/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Assinante", href: "/assinante" },
  { label: "Gestao de Acessos", href: "/assinante/gestao-acessos" },
  { label: "Adicionar" },
];

export default async function SubscriberNewUserPage() {
  const data = await getUserAccountPageData();
  const screenKey = `new-${data.profileOptions.length}-${data.user.accessProfileId}`;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <UserAccountScreen key={screenKey} data={data} />
    </>
  );
}

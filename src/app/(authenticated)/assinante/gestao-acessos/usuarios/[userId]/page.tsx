import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { UserAccountScreen } from "@/components/access-management/user-account-screen";
import { getUserAccountPageData } from "@/lib/access-management/service";

type SubscriberUserAccountPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function SubscriberUserAccountPage({
  params,
}: SubscriberUserAccountPageProps) {
  const { userId } = await params;
  const data = await getUserAccountPageData(userId);
  const screenKey = `${data.user.id ?? "new"}-${data.updatedAt}-${data.user.accessProfileId}`;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Assinante", href: "/assinante" },
    { label: "Gestao de Acessos", href: "/assinante/gestao-acessos" },
    { label: data.user.fullName || "Conta do Usuario" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <UserAccountScreen key={screenKey} data={data} />
    </>
  );
}

import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { AccessProfileListScreen } from "@/components/access-management/access-profile-list-screen";
import { getAccessProfileListPageData } from "@/lib/access-management/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Assinante", href: "/assinante" },
  { label: "Gestao de Acessos", href: "/assinante/gestao-acessos" },
  { label: "Lista de Perfis" },
];

export default async function AccessProfileListPage() {
  const data = await getAccessProfileListPageData();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <AccessProfileListScreen data={data} />
    </>
  );
}

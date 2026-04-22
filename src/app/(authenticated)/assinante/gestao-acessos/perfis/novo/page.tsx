import { AccessProfileEditorScreen } from "@/components/access-management/access-profile-editor-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAccessProfileEditorPageData } from "@/lib/access-management/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Assinante", href: "/assinante" },
  { label: "Gestao de Acessos", href: "/assinante/gestao-acessos" },
  { label: "Lista de Perfis", href: "/assinante/gestao-acessos/perfis" },
  { label: "Adicionar" },
];

export default async function AccessProfileCreatePage() {
  const data = await getAccessProfileEditorPageData();
  const screenKey = `new-${data.profile.code}-${data.permissionMatrix.length}`;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <AccessProfileEditorScreen key={screenKey} data={data} />
    </>
  );
}

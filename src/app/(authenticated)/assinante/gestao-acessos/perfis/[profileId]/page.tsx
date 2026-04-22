import { AccessProfileEditorScreen } from "@/components/access-management/access-profile-editor-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getAccessProfileEditorPageData } from "@/lib/access-management/service";

type AccessProfileEditorPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function AccessProfileEditorPage({
  params,
}: AccessProfileEditorPageProps) {
  const { profileId } = await params;
  const data = await getAccessProfileEditorPageData(profileId);
  const screenKey = `${data.profile.id ?? "new"}-${data.profile.updatedAtKey || data.profile.updatedAt}-${data.permissionMatrix.length}`;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Assinante", href: "/assinante" },
    { label: "Gestao de Acessos", href: "/assinante/gestao-acessos" },
    { label: "Lista de Perfis", href: "/assinante/gestao-acessos/perfis" },
    { label: data.profile.name || "Perfil de Acesso" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <AccessProfileEditorScreen key={screenKey} data={data} />
    </>
  );
}

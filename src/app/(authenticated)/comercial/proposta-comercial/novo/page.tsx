import { CommercialProposalFormScreen } from "@/features/commercial-proposals/components/commercial-proposal-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getCommercialProposalFormPageData } from "@/lib/commercial-proposals/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Comercial" },
  { label: "Propostas Comerciais", href: "/comercial/proposta-comercial" },
  { label: "Nova proposta" },
];

export default async function CommercialProposalCreatePage() {
  const data = await getCommercialProposalFormPageData();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CommercialProposalFormScreen data={data} />
    </>
  );
}

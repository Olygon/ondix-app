import { CommercialProposalFormScreen } from "@/components/commercial-proposals/commercial-proposal-form-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getCommercialProposalFormPageData } from "@/lib/commercial-proposals/service";

type CommercialProposalEditPageProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

export default async function CommercialProposalEditPage({
  params,
}: CommercialProposalEditPageProps) {
  const { proposalId } = await params;
  const data = await getCommercialProposalFormPageData(proposalId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "Comercial" },
    { label: "Propostas Comerciais", href: "/comercial/proposta-comercial" },
    { label: data.proposal.code || "Cadastro da proposta" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CommercialProposalFormScreen
        key={`${data.proposal.id ?? "new"}-${data.updatedAt}-${data.items.length}`}
        data={data}
      />
    </>
  );
}

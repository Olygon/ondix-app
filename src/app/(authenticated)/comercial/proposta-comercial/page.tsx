import { CommercialProposalListScreen } from "@/features/commercial-proposals/components/commercial-proposal-list-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import {
  getCommercialProposalListPageData,
  type CommercialProposalSearchParams,
} from "@/lib/commercial-proposals/service";

const breadcrumbItems: BreadcrumbItem[] = [
  { label: "ONDIX", href: "/" },
  { label: "Comercial" },
  { label: "Propostas Comerciais" },
];

type CommercialProposalListPageProps = {
  searchParams: Promise<CommercialProposalSearchParams>;
};

export default async function CommercialProposalListPage({
  searchParams,
}: CommercialProposalListPageProps) {
  const data = await getCommercialProposalListPageData(await searchParams);
  const screenKey = JSON.stringify(data.filters);

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CommercialProposalListScreen key={screenKey} data={data} />
    </>
  );
}

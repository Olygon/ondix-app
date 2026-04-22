import { CustomerRiskAnalysisScreen } from "@/components/customer-risk/customer-risk-analysis-screen";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getCustomerRiskAnalysisPageData } from "@/lib/customer-risk/service";

type CustomerRiskAnalysisPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerRiskAnalysisPage({
  params,
}: CustomerRiskAnalysisPageProps) {
  const { customerId } = await params;
  const data = await getCustomerRiskAnalysisPageData(customerId);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "ONDIX", href: "/" },
    { label: "CRM / Comercial" },
    { label: "Clientes", href: "/crm/cliente" },
    { label: data.customer.name, href: `/crm/cliente/${data.customer.id}` },
    { label: "Analise de Risco" },
  ];
  const screenKey = `${data.customer.id}-${data.riskAnalysis?.id ?? "empty"}-${data.summary.analysisDate}`;

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <CustomerRiskAnalysisScreen key={screenKey} data={data} />
    </>
  );
}

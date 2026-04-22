import { notFound } from "next/navigation";

import { buildCommercialProposalPdf } from "@/lib/commercial-proposals/pdf";
import { getCommercialProposalPdfPayload } from "@/lib/commercial-proposals/service";

type CommercialProposalPdfRouteContext = {
  params: Promise<{
    proposalId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: CommercialProposalPdfRouteContext,
) {
  const { proposalId } = await params;
  const payload = await getCommercialProposalPdfPayload(proposalId);

  if (!payload) {
    notFound();
  }

  const pdfBuffer = buildCommercialProposalPdf(payload);
  const fileName = `${payload.proposal.code.toLowerCase()}.pdf`;

  return new Response(pdfBuffer, {
    headers: {
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Type": "application/pdf",
    },
  });
}

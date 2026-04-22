import { getProtectedCertificateFile } from "@/lib/customer-certificates/service";

type CertificateFileRouteContext = {
  params: Promise<{
    certificateId: string;
    customerId: string;
  }>;
};

export async function GET(_request: Request, context: CertificateFileRouteContext) {
  const { certificateId, customerId } = await context.params;

  try {
    const file = await getProtectedCertificateFile({ certificateId, customerId });

    if (!file) {
      return new Response("Arquivo nao localizado.", { status: 404 });
    }

    return new Response(new Uint8Array(file.buffer), {
      headers: {
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return new Response("Nao foi possivel abrir o PDF.", { status: 404 });
  }
}

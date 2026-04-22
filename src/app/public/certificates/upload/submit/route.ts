import { NextResponse, type NextRequest } from "next/server";

import { uploadCustomerCertificateFromPublicLink } from "@/lib/customer-certificates/service";

function buildRedirectUrl(request: NextRequest, token: string) {
  const redirectUrl = new URL("/public/certificates/upload", request.url);

  if (token) {
    redirectUrl.searchParams.set("token", token);
  }

  return redirectUrl;
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const redirectUrl = buildRedirectUrl(request, token);
  const formData = await request.formData();
  const rawFile = formData.get("certificateFile");
  const file = rawFile && typeof rawFile !== "string" ? rawFile : null;
  const result = await uploadCustomerCertificateFromPublicLink({
    file,
    token,
  });

  if (!result.ok) {
    redirectUrl.searchParams.set("error", result.code);

    return NextResponse.redirect(redirectUrl, 303);
  }

  redirectUrl.searchParams.set("status", "uploaded");

  return NextResponse.redirect(redirectUrl, 303);
}

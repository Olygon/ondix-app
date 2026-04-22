import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  POST_LOGIN_CONTEXT_COOKIE_NAME,
  POST_LOGIN_CONTEXT_COOKIE_VALUE,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-token";

const POST_LOGIN_NO_COMPANY_STATUS = "company-context-missing";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "no-company";
  const loginUrl = new URL("/login", request.url);
  const hasPendingPostLoginContextCheck =
    request.cookies.get(POST_LOGIN_CONTEXT_COOKIE_NAME)?.value ===
    POST_LOGIN_CONTEXT_COOKIE_VALUE;

  if (status === "no-company") {
    if (hasPendingPostLoginContextCheck) {
      loginUrl.searchParams.set("status", POST_LOGIN_NO_COMPANY_STATUS);
    }
  } else {
    loginUrl.searchParams.set("status", status);
  }

  const response = NextResponse.redirect(loginUrl);

  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(POST_LOGIN_CONTEXT_COOKIE_NAME);

  return response;
}

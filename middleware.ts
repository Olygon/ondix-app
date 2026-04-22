import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session-token";

const CHANGE_PASSWORD_PATH = "/alterar-senha";
const INTERNAL_BYPASS_PATHS = new Set(["/session-invalid"]);
const PUBLIC_AUTH_PATHS = new Set(["/login", "/recuperar-senha"]);

function buildRedirect(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.has(pathname);
  const isPublicCertificateUploadPath = pathname.startsWith(
    "/public/certificates/upload",
  );
  const isChangePasswordPath = pathname === CHANGE_PASSWORD_PATH;

  if (INTERNAL_BYPASS_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isPublicAuthPath || isPublicCertificateUploadPath) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);

    if (!isChangePasswordPath) {
      const nextPath = `${pathname}${nextUrl.search}`;

      if (nextPath !== "/") {
        loginUrl.searchParams.set("next", nextPath);
      }
    }

    return NextResponse.redirect(loginUrl);
  }

  if (session.mustChangePassword && !isChangePasswordPath) {
    return buildRedirect(request, CHANGE_PASSWORD_PATH);
  }

  if (!session.mustChangePassword && isChangePasswordPath) {
    return buildRedirect(request, "/");
  }

  if (isPublicAuthPath) {
    return buildRedirect(
      request,
      session.mustChangePassword ? CHANGE_PASSWORD_PATH : "/",
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};

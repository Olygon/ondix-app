import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession } from "@/lib/auth/session-token";
import {
  POST_LOGIN_CONTEXT_COOKIE_NAME,
  POST_LOGIN_CONTEXT_COOKIE_VALUE,
  POST_LOGIN_CONTEXT_DURATION_IN_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_IN_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session-token";

export async function createUserSession(payload: AuthSession) {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_IN_SECONDS,
  });
}

export async function markPostLoginContextCheck() {
  const cookieStore = await cookies();

  cookieStore.set(
    POST_LOGIN_CONTEXT_COOKIE_NAME,
    POST_LOGIN_CONTEXT_COOKIE_VALUE,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: POST_LOGIN_CONTEXT_DURATION_IN_SECONDS,
    },
  );
}

export async function getUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function destroyUserSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(POST_LOGIN_CONTEXT_COOKIE_NAME);
}

export async function requireAuthenticatedSession() {
  const session = await getUserSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export function sanitizeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("/login") || value.startsWith("/recuperar-senha")) {
    return "/";
  }

  return value;
}

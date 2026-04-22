import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "ondix_session";
export const SESSION_DURATION_IN_SECONDS = 60 * 60 * 12;
export const POST_LOGIN_CONTEXT_COOKIE_NAME = "ondix_post_login_context";
export const POST_LOGIN_CONTEXT_COOKIE_VALUE = "pending";
export const POST_LOGIN_CONTEXT_DURATION_IN_SECONDS = 60 * 2;

export type AuthSession = {
  accessProfileId: string;
  accessProfileName: string;
  activeCompanyId: string;
  activeCompanyName: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
  userCompanyId: string;
  userId: string;
};

function getAuthSecret() {
  return process.env.AUTH_SECRET || "ondix-dev-only-auth-secret-change-me";
}

function getSessionKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signSessionToken(payload: AuthSession) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_IN_SECONDS}s`)
    .sign(getSessionKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify<AuthSession>(token, getSessionKey());

    return payload;
  } catch {
    return null;
  }
}

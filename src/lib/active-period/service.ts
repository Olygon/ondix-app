import "server-only";

import { cookies } from "next/headers";

import { requireAppContext } from "@/lib/auth/app-context";
import type { ActivePeriod } from "@/lib/active-period/types";
import {
  ACTIVE_PERIOD_COOKIE_MAX_AGE,
  getActivePeriodCookieName,
  normalizeActivePeriod,
} from "@/lib/active-period/utils";

export async function getActivePeriodFor(userId: string, companyId: string) {
  const cookieStore = await cookies();
  const cookieName = getActivePeriodCookieName(userId, companyId);

  return normalizeActivePeriod(cookieStore.get(cookieName)?.value);
}

export async function getActivePeriodForContext() {
  const context = await requireAppContext();

  return getActivePeriodFor(context.user.id, context.company.id);
}

export async function setActivePeriodForContext(value: string): Promise<ActivePeriod> {
  const context = await requireAppContext();
  const activePeriod = normalizeActivePeriod(value);
  const cookieStore = await cookies();

  cookieStore.set(
    getActivePeriodCookieName(context.user.id, context.company.id),
    activePeriod.value,
    {
      httpOnly: false,
      maxAge: ACTIVE_PERIOD_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  return activePeriod;
}

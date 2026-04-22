"use server";

import { redirect } from "next/navigation";

import { destroyUserSession } from "@/lib/auth/session";
import { setActivePeriodForContext } from "@/lib/active-period/service";

export async function logoutAction() {
  await destroyUserSession();
  redirect("/login");
}

export async function setActivePeriodAction(value: string) {
  return setActivePeriodForContext(value);
}

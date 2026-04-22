import "server-only";

import { compare, hash } from "bcryptjs";

export async function hashPassword(value: string) {
  return hash(value, 12);
}

export async function verifyPassword(value: string, hashedValue?: string | null) {
  if (!hashedValue) {
    return false;
  }

  return compare(value, hashedValue);
}

export function generateTemporaryPassword() {
  return `${Math.floor(10000000 + Math.random() * 90000000)}`;
}

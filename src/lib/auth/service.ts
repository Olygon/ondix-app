import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { UserStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AuthSession } from "@/lib/auth/session-token";

const ACCOUNT_BLOCKED_MESSAGE =
  "Esta conta foi bloqueada. Contate o administrador da assinatura do sistema ou a equipe de suporte Ondix.";
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha invalidos.";
const NO_COMPANY_MESSAGE =
  "Sua conta ainda nao possui uma empresa ativa vinculada. Contate o suporte Ondix.";
const PASSWORD_RESET_NOT_FOUND_MESSAGE =
  "E-mail nao localizado na base de cadastro. Contate o administrador da sua conta.";
const PASSWORD_RESET_SENT_MESSAGE =
  "Acesse o seu e-mail e siga as orientacoes para entrar com a senha provisoria.";

type AuthenticatedUserRecord = Awaited<ReturnType<typeof findUserByEmail>>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: {
      userCompanies: {
        where: {
          isActive: true,
          accessProfile: {
            status: "ACTIVE",
          },
          company: {
            isActive: true,
          },
        },
        include: {
          company: true,
          accessProfile: true,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });
}

function buildSessionPayload(user: NonNullable<AuthenticatedUserRecord>) {
  const membership = user.userCompanies[0];

  if (!membership) {
    return null;
  }

  return {
    accessProfileId: membership.accessProfileId,
    accessProfileName: membership.accessProfile.name,
    activeCompanyId: membership.companyId,
    activeCompanyName: membership.company.name,
    email: user.email,
    fullName: user.fullName,
    userCompanyId: membership.id,
    userId: user.id,
  };
}

export async function authenticateUser(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return {
      ok: false as const,
      message: INVALID_CREDENTIALS_MESSAGE,
    };
  }

  if (user.status === "BLOCKED" || user.status === "CANCELED") {
    return {
      ok: false as const,
      message: ACCOUNT_BLOCKED_MESSAGE,
    };
  }

  const provisionalPasswordMatched = await verifyPassword(
    password,
    user.provisionalPasswordHash,
  );
  const primaryPasswordMatched = provisionalPasswordMatched
    ? false
    : await verifyPassword(password, user.passwordHash);

  if (!provisionalPasswordMatched && !primaryPasswordMatched) {
    return {
      ok: false as const,
      message: INVALID_CREDENTIALS_MESSAGE,
    };
  }

  if (
    provisionalPasswordMatched &&
    user.provisionalPasswordExpiresAt &&
    user.provisionalPasswordExpiresAt < new Date()
  ) {
    return {
      ok: false as const,
      message:
        "A senha provisoria expirou. Solicite uma nova recuperacao de senha para continuar.",
    };
  }

  const baseSession = buildSessionPayload(user);

  if (!baseSession) {
    return {
      ok: false as const,
      message: NO_COMPANY_MESSAGE,
    };
  }

  const mustChangePassword =
    provisionalPasswordMatched ||
    user.mustChangePassword ||
    !user.acceptedTermsAt ||
    user.status === "PENDING";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  return {
    ok: true as const,
    session: {
      ...baseSession,
      mustChangePassword,
    } satisfies AuthSession,
  };
}

export async function issuePasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!user) {
    return {
      ok: false as const,
      message: PASSWORD_RESET_NOT_FOUND_MESSAGE,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const provisionalPasswordHash = await hashPassword(temporaryPassword);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  const rawToken = randomUUID();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const loginLink = `${getAppUrl()}/login?email=${encodeURIComponent(user.email)}`;

  await prisma.$transaction([
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        provisionalPasswordHash,
        provisionalPasswordExpiresAt: expiresAt,
        status: "PENDING",
        mustChangePassword: true,
      },
    }),
  ]);

  console.info("[ONDIX auth] Password reset preview", {
    email: user.email,
    loginLink,
    temporaryPassword,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    ok: true as const,
    message: PASSWORD_RESET_SENT_MESSAGE,
    preview:
      process.env.NODE_ENV === "production"
        ? null
        : {
            email: user.email,
            expiresAt: expiresAt.toLocaleString("pt-BR"),
            loginLink,
            temporaryPassword,
          },
  };
}

export async function updatePasswordForAuthenticatedUser(
  userId: string,
  newPassword: string,
) {
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        provisionalPasswordHash: null,
        provisionalPasswordExpiresAt: null,
        mustChangePassword: false,
        acceptedTermsAt: now,
        lastPasswordChangeAt: now,
        status: "ACTIVE",
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
  ]);
}

export async function getUserStatus(userId: string): Promise<UserStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  return user?.status ?? null;
}

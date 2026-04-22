import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl?.trim()) {
    throw new Error(
      "DATABASE_URL nao configurada. Revise o arquivo .env antes de iniciar o Prisma.",
    );
  }

  return databaseUrl;
}

export function createPrismaClient(
  options?: Omit<Prisma.PrismaClientOptions, "adapter">,
) {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl(),
  });

  return new PrismaClient({
    adapter,
    ...options,
  });
}

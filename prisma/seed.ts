import "dotenv/config";
import { hash } from "bcryptjs";

import { permissionResourceCatalog } from "../src/lib/access-control/resources";
import {
  accessProfilePermissionSeedMap,
  accessProfileSeedCatalog,
} from "../src/lib/access-control/profile-permissions";
import { governmentCertificateNames } from "../src/lib/company/constants";
import { createPrismaClient } from "../src/lib/prisma-client";
import { seedMunicipalities } from "./municipality-seed";
import { seedServiceClassificationTables } from "./service-classification-seed";

const prisma = createPrismaClient();

type PermissionSnapshot = {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canManage: boolean;
  canView: boolean;
};

const emptyPermissionSnapshot: PermissionSnapshot = {
  canCreate: false,
  canDelete: false,
  canEdit: false,
  canManage: false,
  canView: false,
};

async function syncPermissionResourcesCatalog() {
  for (const resource of permissionResourceCatalog) {
    await prisma.permissionResource.upsert({
      where: { code: resource.code },
      update: {
        area: resource.area,
        description: resource.description,
        isMenuVisible: resource.isMenuVisible,
        module: resource.module,
        name: resource.name,
        parentCode: resource.parentCode,
        route: resource.route,
        sortOrder: resource.sortOrder,
      },
      create: resource,
    });
  }
}

async function backfillMissingAccessProfilePermissions() {
  const [profiles, resources, existingPermissions] = await Promise.all([
    prisma.accessProfile.findMany({
      select: { id: true },
    }),
    prisma.permissionResource.findMany({
      select: {
        code: true,
        id: true,
      },
    }),
    prisma.accessProfilePermission.findMany({
      select: {
        accessProfileId: true,
        canCreate: true,
        canDelete: true,
        canEdit: true,
        canManage: true,
        canView: true,
        permissionResource: {
          select: {
            code: true,
          },
        },
      },
    }),
  ]);
  const resourcesByCode = new Map(resources.map((resource) => [resource.code, resource]));
  const permissionsByProfileId = new Map<string, Map<string, PermissionSnapshot>>();

  for (const permission of existingPermissions) {
    const profilePermissions =
      permissionsByProfileId.get(permission.accessProfileId) ?? new Map<string, PermissionSnapshot>();

    profilePermissions.set(permission.permissionResource.code, {
      canCreate: permission.canCreate,
      canDelete: permission.canDelete,
      canEdit: permission.canEdit,
      canManage: permission.canManage,
      canView: permission.canView,
    });
    permissionsByProfileId.set(permission.accessProfileId, profilePermissions);
  }

  const missingPermissions: Array<
    PermissionSnapshot & {
      accessProfileId: string;
      permissionResourceId: string;
    }
  > = [];

  for (const profile of profiles) {
    const profilePermissions =
      permissionsByProfileId.get(profile.id) ?? new Map<string, PermissionSnapshot>();

    for (const resource of permissionResourceCatalog) {
      const persistedResource = resourcesByCode.get(resource.code);

      if (!persistedResource) {
        throw new Error(`Recurso ${resource.code} nao localizado durante o backfill.`);
      }

      if (profilePermissions.has(resource.code)) {
        continue;
      }

      const parentPermission = resource.parentCode
        ? profilePermissions.get(resource.parentCode)
        : undefined;
      const derivedPermission = parentPermission
        ? {
            canCreate: parentPermission.canCreate,
            canDelete: parentPermission.canDelete,
            canEdit: parentPermission.canEdit,
            canManage: parentPermission.canManage,
            canView: parentPermission.canView,
          }
        : { ...emptyPermissionSnapshot };

      missingPermissions.push({
        accessProfileId: profile.id,
        permissionResourceId: persistedResource.id,
        ...derivedPermission,
      });
      profilePermissions.set(resource.code, derivedPermission);
    }

    permissionsByProfileId.set(profile.id, profilePermissions);
  }

  const chunkSize = 500;

  for (let index = 0; index < missingPermissions.length; index += chunkSize) {
    await prisma.accessProfilePermission.createMany({
      data: missingPermissions.slice(index, index + chunkSize),
      skipDuplicates: true,
    });
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate;
}

function formatInvoiceReference(date: Date) {
  return `ONDIX ${new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
  }).format(date)}`;
}

async function seedSubscriberSubscriptionFinancials(company: {
  contractCode: string | null;
  id: string;
  slug: string;
  subscriptionPlan: string | null;
  subscriptionStatus: "ACTIVE" | "BLOCKED" | "PENDING" | "CANCELED" | "SUSPENDED";
}) {
  const today = new Date();
  const overdueDueDate = addMonths(today, -1);
  const currentDueDate = today;
  const paidDueDate = addMonths(today, -2);
  const nextDueDate = addMonths(today, 1);
  const subscription = await prisma.subscriberSubscription.upsert({
    where: { companyId: company.id },
    update: {
      code: company.contractCode || `SUB-${company.slug.toUpperCase()}`,
      nextChargeAmount: "389.90",
      nextDueDate: currentDueDate,
      planName: company.subscriptionPlan || "Plano Essencial",
      status: company.subscriptionStatus,
    },
    create: {
      code: company.contractCode || `SUB-${company.slug.toUpperCase()}`,
      companyId: company.id,
      nextChargeAmount: "389.90",
      nextDueDate: currentDueDate,
      planName: company.subscriptionPlan || "Plano Essencial",
      status: company.subscriptionStatus,
    },
  });
  const invoices = [
    {
      amount: "389.90",
      dueDate: overdueDueDate,
      paidAt: null,
      paymentMethod: "PIX" as const,
      reference: formatInvoiceReference(overdueDueDate),
      status: "OVERDUE" as const,
    },
    {
      amount: "389.90",
      dueDate: currentDueDate,
      paidAt: null,
      paymentMethod: "STRIPE_CHECKOUT" as const,
      reference: formatInvoiceReference(currentDueDate),
      status: "PENDING" as const,
    },
    {
      amount: "389.90",
      dueDate: paidDueDate,
      paidAt: addDays(paidDueDate, 1),
      paymentMethod: "CREDIT_CARD" as const,
      reference: formatInvoiceReference(paidDueDate),
      status: "PAID" as const,
    },
    {
      amount: "389.90",
      dueDate: nextDueDate,
      paidAt: null,
      paymentMethod: "STRIPE_CHECKOUT" as const,
      reference: formatInvoiceReference(nextDueDate),
      status: "OPEN" as const,
    },
  ];

  for (const invoice of invoices) {
    await prisma.subscriptionInvoice.upsert({
      where: {
        subscriptionId_reference: {
          reference: invoice.reference,
          subscriptionId: subscription.id,
        },
      },
      update: {
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        status: invoice.status,
      },
      create: {
        amount: invoice.amount,
        companyId: company.id,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        reference: invoice.reference,
        status: invoice.status,
        subscriptionId: subscription.id,
      },
    });
  }
}

async function main() {
  await syncPermissionResourcesCatalog();

  for (const profile of accessProfileSeedCatalog) {
    await prisma.accessProfile.upsert({
      where: { code: profile.code },
      update: {
        name: profile.name,
        description: profile.description,
        isAdministrator: profile.isAdministrator,
        isSystem: profile.isSystem,
        level: profile.level,
        sequenceNumber: profile.sequenceNumber,
        status: profile.status,
        tier: profile.tier,
      },
      create: profile,
    });
  }

  for (const profile of accessProfileSeedCatalog) {
    const accessProfile = await prisma.accessProfile.findUnique({
      where: { code: profile.code },
      select: { id: true },
    });

    if (!accessProfile) {
      throw new Error(`Perfil ${profile.code} nao localizado durante a definicao de permissoes.`);
    }

    for (const permission of accessProfilePermissionSeedMap[profile.code]) {
      const resource = await prisma.permissionResource.findUnique({
        where: { code: permission.resourceCode },
        select: { id: true },
      });

      if (!resource) {
        throw new Error(`Recurso ${permission.resourceCode} nao localizado durante o seed.`);
      }

      await prisma.accessProfilePermission.upsert({
        where: {
          accessProfileId_permissionResourceId: {
            accessProfileId: accessProfile.id,
            permissionResourceId: resource.id,
          },
        },
        update: {
          canCreate: permission.canCreate ?? false,
          canDelete: permission.canDelete ?? false,
          canEdit: permission.canEdit ?? false,
          canManage: permission.canManage ?? false,
          canView: permission.canView ?? false,
        },
        create: {
          accessProfileId: accessProfile.id,
          canCreate: permission.canCreate ?? false,
          canDelete: permission.canDelete ?? false,
          permissionResourceId: resource.id,
          canEdit: permission.canEdit ?? false,
          canManage: permission.canManage ?? false,
          canView: permission.canView ?? false,
        },
      });
    }
  }

  await backfillMissingAccessProfilePermissions();

  const municipalitySummary = await seedMunicipalities(prisma);
  console.info(
    `Tabela de municipios IBGE importada: ${municipalitySummary.municipalities} municipios.`,
  );

  const serviceClassificationSummary = await seedServiceClassificationTables(prisma);

  console.info(
    [
      "Tabelas auxiliares de servicos importadas:",
      `${serviceClassificationSummary.law116Codes} codigos Lei 116/03`,
      `${serviceClassificationSummary.nbsCodes} codigos NBS`,
      `${serviceClassificationSummary.municipalTaxCodes} cTribMun`,
      `${serviceClassificationSummary.municipalTaxDuplicates} cTribMun duplicados ignorados`,
    ].join(" "),
  );

  const companyName = process.env.SEED_COMPANY_NAME;
  const companySlug = process.env.SEED_COMPANY_SLUG;
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!companyName || !companySlug || !adminName || !adminEmail || !adminPassword) {
    console.info(
      "Seed executado com perfis padrao e tabelas auxiliares de servicos. Configure SEED_* no .env para criar empresa e usuario inicial.",
    );
    return;
  }

  const adminProfile = await prisma.accessProfile.findUnique({
    where: { code: "ADMIN" },
  });

  if (!adminProfile) {
    throw new Error("Perfil ADMIN nao localizado durante o seed.");
  }

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: {
      name: companyName,
      legalName: companyName,
      contractCode: "CTR-ONDIX-001",
      isActive: true,
      lastEditedAt: new Date(),
      subscriptionDate: new Date(),
      subscriptionPlan: "Plano Essencial",
      subscriptionStatus: "ACTIVE",
    },
    create: {
      name: companyName,
      legalName: companyName,
      slug: companySlug,
      contractCode: "CTR-ONDIX-001",
      isActive: true,
      lastEditedAt: new Date(),
      subscriptionDate: new Date(),
      subscriptionPlan: "Plano Essencial",
      subscriptionStatus: "ACTIVE",
    },
  });

  await seedSubscriberSubscriptionFinancials(company);

  const passwordHash = await hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminName,
      shortName: adminName.split(" ")[0] || adminName,
      department: "Administracao",
      jobTitle: "Administrador da Conta",
      phone: "11 9 9999-9999",
      passwordHash,
      status: "PENDING",
      mustChangePassword: true,
      acceptedTermsAt: null,
      provisionalPasswordHash: null,
      provisionalPasswordExpiresAt: null,
    },
    create: {
      fullName: adminName,
      email: adminEmail,
      shortName: adminName.split(" ")[0] || adminName,
      department: "Administracao",
      jobTitle: "Administrador da Conta",
      phone: "11 9 9999-9999",
      passwordHash,
      status: "PENDING",
      mustChangePassword: true,
      acceptedTermsAt: null,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      accessProfileId: adminProfile.id,
      isPrimary: true,
      isActive: true,
    },
    create: {
      userId: user.id,
      companyId: company.id,
      accessProfileId: adminProfile.id,
      isPrimary: true,
      isActive: true,
    },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      lastEditedByUserId: user.id,
      responsibleAdminUserId: user.id,
    },
  });

  for (const certificateName of governmentCertificateNames) {
    await prisma.governmentCertificate.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: certificateName,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name: certificateName,
        status: "NEGATIVE",
      },
    });
  }

  console.info(`Seed concluido com empresa "${company.name}" e usuario "${user.email}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

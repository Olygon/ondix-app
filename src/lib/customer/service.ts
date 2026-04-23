import "server-only";

import { Prisma as PrismaRuntime } from "@prisma/client";

import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import {
  buildCustomerWriteData,
  type CustomerWriteInput,
} from "@/features/customers/server/helpers";
import {
  findCustomerForCompany,
  findDuplicateDocument,
  getCustomerFormPageData as getCustomerFormPageDataFromQueries,
  getCustomerListPageData as getCustomerListPageDataFromQueries,
  getNextCustomerCode,
} from "@/features/customers/server/queries";
import type {
  CustomerFormPageData,
  CustomerListPageData,
} from "@/features/customers/types/customer-types";
import {
  onlyDigits,
} from "@/lib/formatters/brazil";
import { prisma } from "@/lib/db";
import type { CustomerSearchParams } from "@/features/customers/server/queries";

export type { CustomerSearchParams } from "@/features/customers/server/queries";

async function ensureCustomerCanBeDeleted(_customerId: string) {
  void _customerId;

  // Ponto preparado para bloquear exclusao quando existirem titulos financeiros ativos.
  return { ok: true as const };
}

export async function getCustomerListPageData(
  searchParams?: CustomerSearchParams,
): Promise<CustomerListPageData> {
  return getCustomerListPageDataFromQueries(searchParams);
}

export async function getCustomerFormPageData(
  customerId?: string,
): Promise<CustomerFormPageData> {
  return getCustomerFormPageDataFromQueries(customerId);
}

export async function saveCustomer(input: CustomerWriteInput) {
  const isEdit = Boolean(input.customerId);
  const context = await requirePermission(
    RESOURCE_CODES.crmCustomer,
    isEdit ? "edit" : "add",
  );
  const normalizedFederalDocument = onlyDigits(input.federalDocument);
  const [currentCustomer, duplicateDocument] = await Promise.all([
    input.customerId
      ? findCustomerForCompany(context.company.id, input.customerId)
      : Promise.resolve(null),
    findDuplicateDocument(
      context.company.id,
      normalizedFederalDocument,
      input.customerId,
    ),
  ]);

  if (isEdit && !currentCustomer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  if (duplicateDocument) {
    return {
      ok: false as const,
      fieldErrors: {
        federalDocument: [
          "Ja existe um cliente com este CPF/CNPJ na empresa ativa.",
        ],
      },
      message: "Ja existe um cliente com este CPF/CNPJ na empresa ativa.",
    };
  }

  const data = buildCustomerWriteData({
    ...input,
    federalDocument: normalizedFederalDocument,
  });

  try {
    const savedCustomer = isEdit
      ? await prisma.customer.update({
          data: {
            ...data,
            updatedById: context.user.id,
          },
          where: { id: currentCustomer!.id },
        })
      : await prisma.$transaction(async (tx) => {
          const nextCode = await getNextCustomerCode(context.company.id, tx);

          return tx.customer.create({
            data: {
              ...data,
              code: nextCode,
              companyId: context.company.id,
              createdById: context.user.id,
              updatedById: context.user.id,
            },
          });
        });

    return {
      ok: true as const,
      message: isEdit
        ? "Cliente atualizado com sucesso."
        : "Cliente cadastrado com sucesso.",
      savedCustomerId: savedCustomer.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        fieldErrors: {
          federalDocument: [
            "Ja existe um cliente com este CPF/CNPJ ou codigo nesta empresa.",
          ],
        },
        message:
          "Nao foi possivel salvar porque ja existe um cliente com dados unicos iguais nesta empresa.",
      };
    }

    throw error;
  }
}

export async function deleteCustomer(customerId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmCustomer, "delete");
  const customer = await findCustomerForCompany(context.company.id, customerId);

  if (!customer) {
    return {
      ok: false as const,
      message: "O cliente informado nao foi localizado na empresa ativa.",
    };
  }

  const deletionGuard = await ensureCustomerCanBeDeleted(customer.id);

  if (!deletionGuard.ok) {
    return {
      ok: false as const,
      message:
        "Nao foi possivel excluir este cliente porque existem vinculos financeiros ativos.",
    };
  }

  await prisma.customer.update({
    data: {
      deletedAt: new Date(),
      status: "INACTIVE",
      updatedById: context.user.id,
    },
    where: { id: customer.id },
  });

  return {
    ok: true as const,
    message: "Cliente excluido com sucesso. O registro foi preservado no historico.",
  };
}

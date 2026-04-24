import "server-only";

import { Prisma as PrismaRuntime } from "@prisma/client";

import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { prisma } from "@/lib/db";
import { type ServiceAuxiliaryKind } from "@/features/services/constants/service-constants";
import type {
  AuxiliaryCodeFormValues,
  ProvidedServiceFormValues,
} from "@/features/services/types/service-types";
import {
  findProvidedServiceForCompany,
  getNextProvidedServiceCode,
} from "@/features/services/server/queries";

type ProvidedServiceWriteInput = Omit<
  ProvidedServiceFormValues,
  "code" | "id"
> & {
  serviceId?: string | null;
};

type ServiceMunicipalTaxRuleWriteInput = {
  isDefault: boolean;
  issRate: string;
  municipalTaxCodeId: string;
  municipalityIbgeCode: string;
  notes?: string;
  ruleId?: string | null;
  serviceId: string;
};

type AuxiliaryCodeWriteInput = Omit<AuxiliaryCodeFormValues, "id"> & {
  auxiliaryCodeId?: string | null;
};

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function normalizeDecimalInput(value?: string | null) {
  const normalized = value?.trim().replace(/\./g, "").replace(",", ".") ?? "";

  return normalized || "0";
}

function buildProvidedServiceWriteData(input: ProvidedServiceWriteInput) {
  return {
    administrativeCostPercent: normalizeDecimalInput(input.administrativeCostPercent),
    commissionPercent: normalizeDecimalInput(input.commissionPercent),
    costAmount: normalizeDecimalInput(input.costAmount),
    description: input.description.trim(),
    name: input.name.trim(),
    priceAmount: normalizeDecimalInput(input.priceAmount),
    profitMarginPercent: normalizeDecimalInput(input.profitMarginPercent),
    serviceLaw116Id: input.serviceLaw116Id,
    serviceNbsId: input.serviceNbsId,
    status: input.status,
    taxCbsPercent: normalizeDecimalInput(input.taxCbsPercent),
    taxCidPercent: normalizeDecimalInput(input.taxCidPercent),
    taxCofinsPercent: normalizeDecimalInput(input.taxCofinsPercent),
    taxCsllPercent: normalizeDecimalInput(input.taxCsllPercent),
    taxIbsPercent: normalizeDecimalInput(input.taxIbsPercent),
    taxIcmsPercent: normalizeDecimalInput(input.taxIcmsPercent),
    taxIpiPercent: normalizeDecimalInput(input.taxIpiPercent),
    taxIrpjPercent: normalizeDecimalInput(input.taxIrpjPercent),
    taxPisPercent: normalizeDecimalInput(input.taxPisPercent),
    taxSimpleNationalPercent: normalizeDecimalInput(input.taxSimpleNationalPercent),
  };
}

export async function saveProvidedService(input: ProvidedServiceWriteInput) {
  const isEdit = Boolean(input.serviceId);
  const context = await requirePermission(
    RESOURCE_CODES.crmProvidedServices,
    isEdit ? "edit" : "add",
  );
  const currentService = input.serviceId
    ? await findProvidedServiceForCompany(context.company.id, input.serviceId)
    : null;

  if (isEdit && !currentService) {
    return {
      ok: false as const,
      message: "O servico informado nao foi localizado na empresa ativa.",
    };
  }

  const [law116Code, nbsCode] = await Promise.all([
    prisma.serviceLaw116Code.findUnique({
      where: { id: input.serviceLaw116Id },
    }),
    prisma.serviceNbsCode.findUnique({
      where: { id: input.serviceNbsId },
    }),
  ]);

  if (!law116Code || law116Code.status !== "ACTIVE") {
    return {
      ok: false as const,
      fieldErrors: {
        serviceLaw116Id: ["Selecione um codigo ativo da Lei 116/03."],
      },
      message: "Selecione um codigo ativo da Lei 116/03.",
    };
  }

  if (!nbsCode || nbsCode.status !== "ACTIVE") {
    return {
      ok: false as const,
      fieldErrors: {
        serviceNbsId: ["Selecione um codigo NBS ativo."],
      },
      message: "Selecione um codigo NBS ativo.",
    };
  }

  const data = buildProvidedServiceWriteData(input);

  try {
    const savedService = isEdit
      ? await prisma.providedService.update({
          data: {
            ...data,
            updatedById: context.user.id,
          },
          where: { id: currentService!.id },
        })
      : await prisma.$transaction(async (tx) => {
          const nextCode = await getNextProvidedServiceCode(context.company.id, tx);

          return tx.providedService.create({
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
        ? "Servico atualizado com sucesso."
        : "Servico cadastrado com sucesso.",
      savedId: savedService.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        message: "Nao foi possivel salvar porque ja existe um servico com este codigo na empresa ativa.",
      };
    }

    throw error;
  }
}

export async function deleteProvidedService(serviceId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "delete");
  const service = await findProvidedServiceForCompany(context.company.id, serviceId);

  if (!service) {
    return {
      ok: false as const,
      message: "O servico informado nao foi localizado na empresa ativa.",
    };
  }

  await prisma.providedService.update({
    data: {
      deletedAt: new Date(),
      status: "BLOCKED",
      updatedById: context.user.id,
    },
    where: { id: service.id },
  });

  return {
    ok: true as const,
    message: "Servico excluido com sucesso. O registro foi preservado no historico.",
  };
}

export async function saveServiceMunicipalTaxRule(
  input: ServiceMunicipalTaxRuleWriteInput,
) {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "edit");
  const [service, municipalTaxCode] = await Promise.all([
    findProvidedServiceForCompany(context.company.id, input.serviceId),
    prisma.municipalTaxCode.findUnique({
      where: { id: input.municipalTaxCodeId },
    }),
  ]);

  if (!service) {
    return {
      ok: false as const,
      message: "O servico informado nao foi localizado na empresa ativa.",
    };
  }

  if (!municipalTaxCode || municipalTaxCode.status !== "ACTIVE") {
    return {
      ok: false as const,
      fieldErrors: {
        municipalTaxCodeId: ["Selecione um cTribMun ativo."],
      },
      message: "Selecione um cTribMun ativo.",
    };
  }

  if (municipalTaxCode.municipalityIbgeCode !== input.municipalityIbgeCode) {
    return {
      ok: false as const,
      fieldErrors: {
        municipalityIbgeCode: [
          "O municipio informado deve ser o mesmo municipio do cTribMun selecionado.",
        ],
      },
      message: "O municipio informado deve corresponder ao cTribMun selecionado.",
    };
  }

  const data = {
    issRate: normalizeDecimalInput(input.issRate),
    isDefault: input.isDefault,
    municipalTaxCodeId: input.municipalTaxCodeId,
    municipalityIbgeCode: input.municipalityIbgeCode,
    notes: normalizeNullable(input.notes),
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.serviceMunicipalTaxRule.updateMany({
          data: { isDefault: false },
          where: {
            companyId: context.company.id,
            serviceId: service.id,
          },
        });
      }

      if (input.ruleId) {
        await tx.serviceMunicipalTaxRule.update({
          data,
          where: { id: input.ruleId },
        });
        return;
      }

      await tx.serviceMunicipalTaxRule.create({
        data: {
          ...data,
          companyId: context.company.id,
          serviceId: service.id,
        },
      });
    });

    return {
      ok: true as const,
      message: input.ruleId
        ? "Vinculo municipal atualizado com sucesso."
        : "Vinculo municipal cadastrado com sucesso.",
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        fieldErrors: {
          municipalityIbgeCode: [
            "Este servico ja possui um cTribMun vinculado para o municipio informado.",
          ],
        },
        message:
          "Este servico ja possui um cTribMun vinculado para o municipio informado.",
      };
    }

    throw error;
  }
}

export async function deleteServiceMunicipalTaxRule(serviceId: string, ruleId: string) {
  const context = await requirePermission(RESOURCE_CODES.crmProvidedServices, "edit");
  const rule = await prisma.serviceMunicipalTaxRule.findFirst({
    where: {
      companyId: context.company.id,
      id: ruleId,
      serviceId,
      service: {
        companyId: context.company.id,
        deletedAt: null,
      },
    },
  });

  if (!rule) {
    return {
      ok: false as const,
      message: "O vinculo municipal informado nao foi localizado.",
    };
  }

  await prisma.serviceMunicipalTaxRule.delete({
    where: { id: rule.id },
  });

  return {
    ok: true as const,
    message: "Vinculo municipal removido com sucesso.",
  };
}

export async function saveAuxiliaryCode(
  kind: ServiceAuxiliaryKind,
  input: AuxiliaryCodeWriteInput,
) {
  const isEdit = Boolean(input.auxiliaryCodeId);

  await requirePermission(
    RESOURCE_CODES.crmProvidedServices,
    isEdit ? "edit" : "add",
  );

  try {
    if (kind === "municipalTax") {
      const municipality = await prisma.municipality.findUnique({
        where: { ibgeCode: input.municipalityIbgeCode.trim() },
      });

      if (!municipality) {
        return {
          ok: false as const,
          fieldErrors: {
            municipalityIbgeCode: ["Selecione um codigo de municipio valido."],
          },
          message: "Selecione um codigo de municipio valido.",
        };
      }

      const data = {
        cTribMun: input.code.trim(),
        defaultIssRate: normalizeDecimalInput(input.defaultIssRate),
        description: input.description.trim(),
        municipalityIbgeCode: municipality.ibgeCode,
        municipalityName: municipality.name,
        stateCode: municipality.stateCode,
        status: input.status,
      };
      const saved = isEdit
        ? await prisma.municipalTaxCode.update({
            data,
            where: { id: input.auxiliaryCodeId! },
          })
        : await prisma.municipalTaxCode.create({ data });

      return {
        ok: true as const,
        message: isEdit ? "cTribMun atualizado com sucesso." : "cTribMun cadastrado com sucesso.",
        savedId: saved.id,
      };
    }

    if (kind === "nbs") {
      const data = {
        category: normalizeNullable(input.category),
        code: input.code.trim(),
        description: input.description.trim(),
        status: input.status,
      };
      const saved = isEdit
        ? await prisma.serviceNbsCode.update({
            data,
            where: { id: input.auxiliaryCodeId! },
          })
        : await prisma.serviceNbsCode.create({ data });

      return {
        ok: true as const,
        message: isEdit ? "Codigo NBS atualizado com sucesso." : "Codigo NBS cadastrado com sucesso.",
        savedId: saved.id,
      };
    }

    const data = {
      category: normalizeNullable(input.category),
      cTribNac: input.code.trim(),
      description: input.description.trim(),
      requiresConstruction: input.requiresConstruction,
      requiresEvent: input.requiresEvent,
      requiresProperty: input.requiresProperty,
      status: input.status,
    };
    const saved = isEdit
      ? await prisma.serviceLaw116Code.update({
          data,
          where: { id: input.auxiliaryCodeId! },
        })
      : await prisma.serviceLaw116Code.create({ data });

    return {
      ok: true as const,
      message: isEdit
        ? "Codigo da Lei 116/03 atualizado com sucesso."
        : "Codigo da Lei 116/03 cadastrado com sucesso.",
      savedId: saved.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        message:
          "Nao foi possivel salvar porque ja existe um codigo igual cadastrado.",
      };
    }

    throw error;
  }
}

export async function inactivateAuxiliaryCode(
  kind: ServiceAuxiliaryKind,
  auxiliaryCodeId: string,
) {
  await requirePermission(RESOURCE_CODES.crmProvidedServices, "delete");

  if (kind === "municipalTax") {
    await prisma.municipalTaxCode.update({
      data: { status: "INACTIVE" },
      where: { id: auxiliaryCodeId },
    });

    return {
      ok: true as const,
      message: "cTribMun inativado com sucesso.",
    };
  }

  if (kind === "nbs") {
    await prisma.serviceNbsCode.update({
      data: { status: "INACTIVE" },
      where: { id: auxiliaryCodeId },
    });

    return {
      ok: true as const,
      message: "Codigo NBS inativado com sucesso.",
    };
  }

  await prisma.serviceLaw116Code.update({
    data: { status: "INACTIVE" },
    where: { id: auxiliaryCodeId },
  });

  return {
    ok: true as const,
    message: "Codigo da Lei 116/03 inativado com sucesso.",
  };
}

import "server-only";

import type {
  CommercialProposal,
  CommercialProposalPaymentMethod,
  CommercialProposalStatus,
} from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";

import { requirePermission } from "@/lib/access-control/permission-service";
import { RESOURCE_CODES } from "@/lib/access-control/resources";
import { prisma } from "@/lib/db";
import { commercialProposalBaseRoute } from "@/features/commercial-proposals/constants/commercial-proposal-constants";
import { normalizeDecimalInput } from "@/lib/helpers/number";
import {
  formatProposalCode,
  isCurrentUserApprovalAllowed,
  moneyString,
  normalizeDateInput,
  roundMoney,
  toNumber,
} from "@/features/commercial-proposals/server/helpers";
import {
  findProposalForCompany,
  getNextCommercialProposalCode,
} from "@/features/commercial-proposals/server/queries";

type CommercialProposalWriteInput = {
  customerId: string;
  deliveryCostAmount: string;
  deliveryDeadline?: string;
  downPaymentAmount: string;
  globalDiscountAmount: string;
  issueDate: string;
  items: Array<{
    id?: string | null;
    lineDiscountAmount: string;
    lineDiscountPercent: string;
    quantity: string;
    serviceCodeSnapshot: string;
    serviceDescriptionSnapshot: string;
    serviceId: string;
    serviceNameSnapshot: string;
    sortOrder?: number;
    unitPriceAmount: string;
  }>;
  materialCostAmount: string;
  notes?: string;
  otherCostAmount: string;
  paymentMethod: CommercialProposalPaymentMethod;
  proposalId?: string | null;
  status: CommercialProposalStatus;
  validUntil: string;
};

type CalculatedProposalItem = {
  data: {
    lineDiscountAmount: string;
    lineDiscountPercent: string;
    lineSubtotalAmount: string;
    lineTotalAmount: string;
    quantity: string;
    serviceCodeSnapshot: string;
    serviceDescriptionSnapshot: string;
    serviceId: string;
    serviceNameSnapshot: string;
    sortOrder: number;
    unitPriceAmount: string;
  };
  discountTotal: number;
  subtotal: number;
};

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed || null;
}

function calculateProposal(input: CommercialProposalWriteInput) {
  const items = input.items.map((item, index) => {
    const unitPrice = toNumber(normalizeDecimalInput(item.unitPriceAmount));
    const quantity = toNumber(normalizeDecimalInput(item.quantity));
    const discountAmount = toNumber(normalizeDecimalInput(item.lineDiscountAmount));
    const discountPercent = toNumber(normalizeDecimalInput(item.lineDiscountPercent));
    const lineSubtotal = roundMoney(unitPrice * quantity);
    const discountFromPercent = roundMoney(lineSubtotal * (discountPercent / 100));
    const lineDiscountTotal = roundMoney(discountAmount + discountFromPercent);
    const lineTotal = roundMoney(lineSubtotal - lineDiscountTotal);

    if (lineTotal < 0) {
      return {
        error: `O desconto do item ${index + 1} nao pode deixar o total negativo.`,
      } as const;
    }

    return {
      data: {
        lineDiscountAmount: moneyString(discountAmount),
        lineDiscountPercent: normalizeDecimalInput(item.lineDiscountPercent),
        lineSubtotalAmount: moneyString(lineSubtotal),
        lineTotalAmount: moneyString(lineTotal),
        quantity: normalizeDecimalInput(item.quantity),
        serviceCodeSnapshot: item.serviceCodeSnapshot.trim(),
        serviceDescriptionSnapshot: item.serviceDescriptionSnapshot.trim(),
        serviceId: item.serviceId,
        serviceNameSnapshot: item.serviceNameSnapshot.trim(),
        sortOrder: item.sortOrder ?? index,
        unitPriceAmount: moneyString(unitPrice),
      },
      discountTotal: lineDiscountTotal,
      subtotal: lineSubtotal,
    } as const;
  });

  const firstError = items.find((item) => "error" in item);

  if (firstError && "error" in firstError) {
    return {
      ok: false as const,
      message: firstError.error,
    };
  }

  const calculatedItems = items as CalculatedProposalItem[];
  const subtotal = roundMoney(
    calculatedItems.reduce((total, item) => total + item.subtotal, 0),
  );
  const itemDiscounts = roundMoney(
    calculatedItems.reduce((total, item) => total + item.discountTotal, 0),
  );
  const globalDiscount = toNumber(normalizeDecimalInput(input.globalDiscountAmount));
  const deliveryCost = toNumber(normalizeDecimalInput(input.deliveryCostAmount));
  const materialCost = toNumber(normalizeDecimalInput(input.materialCostAmount));
  const otherCost = toNumber(normalizeDecimalInput(input.otherCostAmount));
  const totalDiscount = roundMoney(itemDiscounts + globalDiscount);
  const totalAmount = roundMoney(
    subtotal - totalDiscount + deliveryCost + materialCost + otherCost,
  );

  if (totalAmount < 0) {
    return {
      ok: false as const,
      message: "Os descontos da proposta nao podem deixar o total final negativo.",
    };
  }

  return {
    ok: true as const,
    items: calculatedItems.map((item) => item.data),
    totals: {
      deliveryCostAmount: moneyString(deliveryCost),
      globalDiscountAmount: moneyString(globalDiscount),
      materialCostAmount: moneyString(materialCost),
      otherCostAmount: moneyString(otherCost),
      subtotalAmount: moneyString(subtotal),
      totalAmount: moneyString(totalAmount),
      totalDiscountAmount: moneyString(totalDiscount),
    },
  };
}

async function ensureCustomerForProposal(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: {
      companyId,
      deletedAt: null,
      id: customerId,
    },
  });
}

async function ensureServicesForProposal(companyId: string, serviceIds: string[]) {
  const uniqueServiceIds = Array.from(new Set(serviceIds));
  const services = await prisma.providedService.findMany({
    select: { id: true },
    where: {
      companyId,
      deletedAt: null,
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  return services.length === uniqueServiceIds.length;
}

function getStatusDateData(
  status: CommercialProposalStatus,
  currentProposal?: CommercialProposal | null,
) {
  const now = new Date();

  return {
    expiredAt:
      status === "EXPIRED" && !currentProposal?.expiredAt
        ? now
        : currentProposal?.expiredAt,
    rejectedAt:
      status === "REJECTED" && !currentProposal?.rejectedAt
        ? now
        : currentProposal?.rejectedAt,
  };
}

export async function saveCommercialProposal(input: CommercialProposalWriteInput) {
  const isEdit = Boolean(input.proposalId);
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    isEdit ? "edit" : "add",
  );
  const [currentProposal, customer, servicesAreValid] = await Promise.all([
    input.proposalId
      ? findProposalForCompany(context.company.id, input.proposalId)
      : Promise.resolve(null),
    ensureCustomerForProposal(context.company.id, input.customerId),
    ensureServicesForProposal(
      context.company.id,
      input.items.map((item) => item.serviceId),
    ),
  ]);

  if (isEdit && !currentProposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (currentProposal?.status === "CONTRACTED" || currentProposal?.contractId) {
    return {
      ok: false as const,
      message: "Propostas contratadas nao podem ser alteradas.",
    };
  }

  if (!customer) {
    return {
      ok: false as const,
      fieldErrors: {
        customerId: ["Selecione um cliente da empresa ativa."],
      },
      message: "Selecione um cliente da empresa ativa.",
    };
  }

  if (!servicesAreValid) {
    return {
      ok: false as const,
      fieldErrors: {
        items: ["Todos os itens devem usar servicos da empresa ativa."],
      },
      message: "Revise os servicos selecionados nos itens da proposta.",
    };
  }

  const calculated = calculateProposal(input);

  if (!calculated.ok) {
    return {
      ok: false as const,
      fieldErrors: {
        items: [calculated.message],
      },
      message: calculated.message,
    };
  }

  const statusDates = getStatusDateData(input.status, currentProposal);
  const proposalData = {
    ...calculated.totals,
    customerId: customer.id,
    deliveryDeadline: normalizeNullable(input.deliveryDeadline),
    downPaymentAmount: normalizeDecimalInput(input.downPaymentAmount),
    issueDate: normalizeDateInput(input.issueDate),
    notes: normalizeNullable(input.notes),
    paymentMethod: input.paymentMethod,
    status: input.status,
    validUntil: normalizeDateInput(input.validUntil),
    ...statusDates,
  };

  try {
    const savedProposal = isEdit
      ? await prisma.$transaction(async (tx) => {
          await tx.commercialProposalItem.deleteMany({
            where: {
              companyId: context.company.id,
              proposalId: currentProposal!.id,
            },
          });
          const updated = await tx.commercialProposal.update({
            data: {
              ...proposalData,
              updatedById: context.user.id,
            },
            where: { id: currentProposal!.id },
          });
          await tx.commercialProposalItem.createMany({
            data: calculated.items.map((item) => ({
              ...item,
              companyId: context.company.id,
              proposalId: updated.id,
            })),
          });

          return updated;
        })
      : await prisma.$transaction(async (tx) => {
          const nextCode = await getNextCommercialProposalCode(context.company.id, tx);
          const created = await tx.commercialProposal.create({
            data: {
              ...proposalData,
              code: nextCode,
              companyId: context.company.id,
              createdById: context.user.id,
              updatedById: context.user.id,
            },
          });
          await tx.commercialProposalItem.createMany({
            data: calculated.items.map((item) => ({
              ...item,
              companyId: context.company.id,
              proposalId: created.id,
            })),
          });

          return created;
        });

    return {
      ok: true as const,
      message: isEdit
        ? "Proposta comercial atualizada com sucesso."
        : "Proposta comercial cadastrada com sucesso.",
      savedId: savedProposal.id,
    };
  } catch (error) {
    if (
      error instanceof PrismaRuntime.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false as const,
        message:
          "Nao foi possivel salvar porque ja existe uma proposta com este codigo na empresa ativa.",
      };
    }

    throw error;
  }
}

export async function deleteCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "delete",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.status === "CONTRACTED" || proposal.contractId) {
    return {
      ok: false as const,
      message:
        "Propostas contratadas ou vinculadas a contrato nao podem ser excluidas.",
    };
  }

  await prisma.commercialProposal.update({
    data: {
      deletedAt: new Date(),
      status: "INACTIVE",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: "Proposta excluida com sucesso. O registro foi preservado no historico.",
  };
}

export async function inactivateCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.status === "CONTRACTED" || proposal.contractId) {
    return {
      ok: false as const,
      message:
        "Propostas contratadas ou vinculadas a contrato nao podem ser inativadas.",
    };
  }

  await prisma.commercialProposal.update({
    data: {
      status: "INACTIVE",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: "Proposta inativada com sucesso.",
  };
}

export async function approveCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );

  if (!isCurrentUserApprovalAllowed(context)) {
    return {
      ok: false as const,
      message: "A aprovacao e permitida apenas para usuario gestor ou administrador.",
    };
  }

  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.items.length === 0) {
    return {
      ok: false as const,
      message: "A proposta precisa ter pelo menos um item para ser aprovada.",
    };
  }

  if (proposal.contractId) {
    return {
      ok: false as const,
      message: "Propostas contratadas nao podem ser aprovadas novamente.",
    };
  }

  await prisma.commercialProposal.update({
    data: {
      approvedAt: new Date(),
      approvedById: context.user.id,
      status: "APPROVED",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: `Proposta aprovada por ${context.user.fullName}.`,
  };
}

export async function sendCommercialProposalByEmail(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (!proposal.customer.email) {
    return {
      ok: false as const,
      message: "O cliente nao possui e-mail cadastrado para envio.",
    };
  }

  if (proposal.status === "CONTRACTED" || proposal.contractId) {
    return {
      ok: false as const,
      message: "Propostas contratadas nao podem ser reenviadas por este fluxo.",
    };
  }

  const pdfUrl = `${commercialProposalBaseRoute}/${proposal.id}/pdf`;

  console.info("[ONDIX commercial proposal] Mock e-mail enviado", {
    customerEmail: proposal.customer.email,
    customerId: proposal.customer.id,
    message: `Proposta ${formatProposalCode(proposal.code)} disponivel em ${pdfUrl}`,
    proposalId: proposal.id,
  });

  await prisma.commercialProposal.update({
    data: {
      status: proposal.status === "APPROVED" ? "APPROVED" : "SENT",
      updatedById: context.user.id,
    },
    where: { id: proposal.id },
  });

  return {
    ok: true as const,
    message: `Envio por e-mail registrado em mock para ${proposal.customer.email}.`,
  };
}

export async function generateContractFromCommercialProposal(proposalId: string) {
  const context = await requirePermission(
    RESOURCE_CODES.crmCommercialProposal,
    "edit",
  );
  const proposal = await findProposalForCompany(context.company.id, proposalId);

  if (!proposal) {
    return {
      ok: false as const,
      message: "A proposta informada nao foi localizada na empresa ativa.",
    };
  }

  if (proposal.status !== "APPROVED") {
    return {
      ok: false as const,
      message: "A geracao de contrato exige uma proposta aprovada.",
    };
  }

  if (proposal.contractId) {
    return {
      ok: false as const,
      message: "Esta proposta ja possui contrato vinculado.",
    };
  }

  return {
    ok: true as const,
    message:
      "Fluxo preparado: o modulo de contratos ainda nao esta implementado. A proposta permanece aprovada e pronta para conversao futura.",
  };
}

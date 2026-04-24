"use server";

import { revalidatePath } from "next/cache";

import {
  initialServiceCollectionActionState,
  initialServiceFormActionState,
  type ServiceCollectionActionState,
  type ServiceFormActionState,
} from "@/features/services/types/service-form-state";
import {
  deleteProvidedService,
  deleteServiceMunicipalTaxRule,
  inactivateAuxiliaryCode,
  parseServiceAuxiliaryKind,
  saveAuxiliaryCode,
  saveProvidedService,
  saveServiceMunicipalTaxRule,
} from "@/lib/services/service";
import {
  getFieldErrors,
  municipalTaxCodeSchema,
  providedServiceSchema,
  serviceLaw116Schema,
  serviceMunicipalTaxRuleSchema,
  serviceNbsSchema,
} from "@/features/services/schemas/service-schemas";
import {
  auxiliaryKindRoutes,
  type ServiceAuxiliaryKind,
} from "@/features/services/constants/service-constants";
import { getCheckboxValue, getFormValue } from "@/lib/helpers/form-data";

function getAuxiliaryRoute(kind: ServiceAuxiliaryKind) {
  return auxiliaryKindRoutes[kind];
}

export async function saveProvidedServiceAction(
  previousState: ServiceFormActionState = initialServiceFormActionState,
  formData: FormData,
): Promise<ServiceFormActionState> {
  void previousState;

  const parsedData = providedServiceSchema.safeParse({
    administrativeCostPercent: getFormValue(formData, "administrativeCostPercent"),
    commissionPercent: getFormValue(formData, "commissionPercent"),
    costAmount: getFormValue(formData, "costAmount"),
    description: getFormValue(formData, "description"),
    name: getFormValue(formData, "name"),
    priceAmount: getFormValue(formData, "priceAmount"),
    profitMarginPercent: getFormValue(formData, "profitMarginPercent"),
    serviceLaw116Id: getFormValue(formData, "serviceLaw116Id"),
    serviceNbsId: getFormValue(formData, "serviceNbsId"),
    status: getFormValue(formData, "status"),
    taxCbsPercent: getFormValue(formData, "taxCbsPercent"),
    taxCidPercent: getFormValue(formData, "taxCidPercent"),
    taxCofinsPercent: getFormValue(formData, "taxCofinsPercent"),
    taxCsllPercent: getFormValue(formData, "taxCsllPercent"),
    taxIbsPercent: getFormValue(formData, "taxIbsPercent"),
    taxIcmsPercent: getFormValue(formData, "taxIcmsPercent"),
    taxIpiPercent: getFormValue(formData, "taxIpiPercent"),
    taxIrpjPercent: getFormValue(formData, "taxIrpjPercent"),
    taxPisPercent: getFormValue(formData, "taxPisPercent"),
    taxSimpleNationalPercent: getFormValue(formData, "taxSimpleNationalPercent"),
  });

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os campos obrigatorios antes de salvar o servico.",
      status: "error",
    };
  }

  const result = await saveProvidedService({
    ...parsedData.data,
    serviceId: getFormValue(formData, "serviceId") || undefined,
    status: parsedData.data.status as Parameters<typeof saveProvidedService>[0]["status"],
  });

  if (!result.ok) {
    return {
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      message: result.message,
      status: "error",
    };
  }

  revalidatePath("/crm/servicos");
  revalidatePath(`/crm/servicos/${result.savedId}`);

  return {
    message: result.message,
    savedId: result.savedId,
    status: "success",
  };
}

export async function deleteProvidedServiceAction(
  previousState: ServiceCollectionActionState = initialServiceCollectionActionState,
  formData: FormData,
): Promise<ServiceCollectionActionState> {
  void previousState;

  const serviceId = getFormValue(formData, "serviceId");

  if (!serviceId) {
    return {
      message: "Selecione um servico valido para continuar.",
      status: "error",
    };
  }

  const result = await deleteProvidedService(serviceId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidatePath("/crm/servicos");

  return {
    message: result.message,
    status: "success",
  };
}

export async function saveServiceMunicipalTaxRuleAction(
  previousState: ServiceFormActionState = initialServiceFormActionState,
  formData: FormData,
): Promise<ServiceFormActionState> {
  void previousState;

  const parsedData = serviceMunicipalTaxRuleSchema.safeParse({
    isDefault: getCheckboxValue(formData, "isDefault"),
    issRate: getFormValue(formData, "issRate"),
    municipalTaxCodeId: getFormValue(formData, "municipalTaxCodeId"),
    municipalityIbgeCode: getFormValue(formData, "municipalityIbgeCode"),
    notes: getFormValue(formData, "notes"),
  });

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os campos do vinculo municipal antes de salvar.",
      status: "error",
    };
  }

  const serviceId = getFormValue(formData, "serviceId");

  if (!serviceId) {
    return {
      message: "Salve o servico antes de cadastrar a tributacao municipal.",
      status: "error",
    };
  }

  const result = await saveServiceMunicipalTaxRule({
    ...parsedData.data,
    ruleId: getFormValue(formData, "ruleId") || undefined,
    serviceId,
  });

  if (!result.ok) {
    return {
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
      message: result.message,
      status: "error",
    };
  }

  revalidatePath(`/crm/servicos/${serviceId}`);

  return {
    message: result.message,
    status: "success",
  };
}

export async function deleteServiceMunicipalTaxRuleAction(
  previousState: ServiceCollectionActionState = initialServiceCollectionActionState,
  formData: FormData,
): Promise<ServiceCollectionActionState> {
  void previousState;

  const serviceId = getFormValue(formData, "serviceId");
  const ruleId = getFormValue(formData, "ruleId");

  if (!serviceId || !ruleId) {
    return {
      message: "Selecione um vinculo municipal valido para continuar.",
      status: "error",
    };
  }

  const result = await deleteServiceMunicipalTaxRule(serviceId, ruleId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidatePath(`/crm/servicos/${serviceId}`);

  return {
    message: result.message,
    status: "success",
  };
}

export async function saveAuxiliaryCodeAction(
  previousState: ServiceFormActionState = initialServiceFormActionState,
  formData: FormData,
): Promise<ServiceFormActionState> {
  void previousState;

  const kind = parseServiceAuxiliaryKind(getFormValue(formData, "kind"));
  const rawData = {
    category: getFormValue(formData, "category"),
    code: getFormValue(formData, "code"),
    defaultIssRate: getFormValue(formData, "defaultIssRate"),
    description: getFormValue(formData, "description"),
    municipalityIbgeCode: getFormValue(formData, "municipalityIbgeCode"),
    municipalityName: getFormValue(formData, "municipalityName"),
    requiresConstruction: getCheckboxValue(formData, "requiresConstruction"),
    requiresEvent: getCheckboxValue(formData, "requiresEvent"),
    requiresProperty: getCheckboxValue(formData, "requiresProperty"),
    stateCode: getFormValue(formData, "stateCode"),
    status: getFormValue(formData, "status"),
  };
  const schema =
    kind === "municipalTax"
      ? municipalTaxCodeSchema
      : kind === "nbs"
        ? serviceNbsSchema
        : serviceLaw116Schema;
  const parsedData = schema.safeParse(rawData);

  if (!parsedData.success) {
    return {
      fieldErrors: getFieldErrors(parsedData.error),
      message: "Revise os campos obrigatorios antes de salvar o codigo.",
      status: "error",
    };
  }

  const result = await saveAuxiliaryCode(kind, {
    ...rawData,
    auxiliaryCodeId: getFormValue(formData, "auxiliaryCodeId") || undefined,
    status: rawData.status as Parameters<typeof saveAuxiliaryCode>[1]["status"],
  });

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidatePath(getAuxiliaryRoute(kind));
  revalidatePath(`${getAuxiliaryRoute(kind)}/${result.savedId}`);

  return {
    message: result.message,
    savedId: result.savedId,
    status: "success",
  };
}

export async function inactivateAuxiliaryCodeAction(
  previousState: ServiceCollectionActionState = initialServiceCollectionActionState,
  formData: FormData,
): Promise<ServiceCollectionActionState> {
  void previousState;

  const kind = parseServiceAuxiliaryKind(getFormValue(formData, "kind"));
  const auxiliaryCodeId = getFormValue(formData, "auxiliaryCodeId");

  if (!auxiliaryCodeId) {
    return {
      message: "Selecione um codigo valido para continuar.",
      status: "error",
    };
  }

  const result = await inactivateAuxiliaryCode(kind, auxiliaryCodeId);

  if (!result.ok) {
    return {
      message: result.message,
      status: "error",
    };
  }

  revalidatePath(getAuxiliaryRoute(kind));

  return {
    message: result.message,
    status: "success",
  };
}

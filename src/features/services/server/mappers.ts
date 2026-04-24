import "server-only";

import type {
  Municipality,
  MunicipalTaxCode,
  ProvidedService,
  ServiceLaw116Code,
  ServiceMunicipalTaxRule,
  ServiceNbsCode,
} from "@prisma/client";

import type {
  AuxiliaryCodeFormValues,
  AuxiliaryCodeListRow,
  MunicipalityOption,
  MunicipalTaxCodeOption,
  ProvidedServiceFormValues,
  ProvidedServiceListRow,
  ServiceMunicipalTaxRuleRow,
  ServiceOption,
} from "@/features/services/types/service-types";
import type { ServiceAuxiliaryKind } from "@/features/services/constants/service-constants";
import {
  formatCodeOption,
  formatServiceCode,
  toCurrency,
  toDecimalInput,
  toDecimalInputFixed,
  toPercent,
} from "@/features/services/server/helpers";

export function mapProvidedServiceListRow(
  service: ProvidedService & {
    serviceLaw116: ServiceLaw116Code;
    serviceNbs: ServiceNbsCode;
  },
): ProvidedServiceListRow {
  return {
    code: formatServiceCode(service.code),
    costAmount: toCurrency(service.costAmount),
    description: service.description,
    id: service.id,
    law116: service.serviceLaw116.cTribNac,
    name: service.name,
    nbs: service.serviceNbs.code,
    priceAmount: toCurrency(service.priceAmount),
    profitMarginPercent: toPercent(service.profitMarginPercent),
    status: service.status,
  };
}

export function mapServiceOption(code: ServiceLaw116Code | ServiceNbsCode): ServiceOption {
  const codeValue = "cTribNac" in code ? code.cTribNac : code.code;

  return {
    id: code.id,
    label: formatCodeOption(codeValue, code.description),
    status: code.status,
  };
}

export function mapMunicipalTaxCodeOption(code: MunicipalTaxCode): MunicipalTaxCodeOption {
  return {
    defaultIssRate: toDecimalInput(code.defaultIssRate),
    id: code.id,
    label: `${code.municipalityName || "Municipio"} / ${code.stateCode || "UF"} / ${code.municipalityIbgeCode} / ${code.cTribMun} - ${code.description}`,
    municipalityIbgeCode: code.municipalityIbgeCode,
    municipalityName: code.municipalityName,
    stateCode: code.stateCode,
    status: code.status,
  };
}

export function mapMunicipalityOption(municipality: Municipality): MunicipalityOption {
  return {
    ibgeCode: municipality.ibgeCode,
    label: `${municipality.ibgeCode} - ${municipality.name}/${municipality.stateCode}`,
    name: municipality.name,
    stateCode: municipality.stateCode,
  };
}

export function mapTaxRuleRow(
  rule: ServiceMunicipalTaxRule & {
    municipalTaxCode: MunicipalTaxCode;
  },
): ServiceMunicipalTaxRuleRow {
  return {
    cTribMun: rule.municipalTaxCode.cTribMun,
    description: rule.municipalTaxCode.description,
    id: rule.id,
    isDefault: rule.isDefault,
    issRate: toDecimalInput(rule.issRate),
    municipalTaxCodeId: rule.municipalTaxCodeId,
    municipalityIbgeCode: rule.municipalityIbgeCode,
    municipalityName: rule.municipalTaxCode.municipalityName,
    notes: rule.notes ?? "",
  };
}

export function mapProvidedServiceFormValues(
  service: ProvidedService | null,
  code: number,
): ProvidedServiceFormValues {
  return {
    administrativeCostPercent: toDecimalInput(service?.administrativeCostPercent),
    code: formatServiceCode(service?.code ?? code),
    commissionPercent: toDecimalInput(service?.commissionPercent),
    costAmount: toDecimalInput(service?.costAmount),
    description: service?.description ?? "",
    id: service?.id ?? null,
    name: service?.name ?? "",
    priceAmount: toDecimalInput(service?.priceAmount),
    profitMarginPercent: toDecimalInput(service?.profitMarginPercent),
    serviceLaw116Id: service?.serviceLaw116Id ?? "",
    serviceNbsId: service?.serviceNbsId ?? "",
    status: service?.status ?? "ACTIVE",
    taxCbsPercent: toDecimalInput(service?.taxCbsPercent),
    taxCidPercent: toDecimalInput(service?.taxCidPercent),
    taxCofinsPercent: toDecimalInput(service?.taxCofinsPercent),
    taxCsllPercent: toDecimalInput(service?.taxCsllPercent),
    taxIbsPercent: toDecimalInput(service?.taxIbsPercent),
    taxIcmsPercent: toDecimalInput(service?.taxIcmsPercent),
    taxIpiPercent: toDecimalInput(service?.taxIpiPercent),
    taxIrpjPercent: toDecimalInput(service?.taxIrpjPercent),
    taxPisPercent: toDecimalInput(service?.taxPisPercent),
    taxSimpleNationalPercent: toDecimalInput(service?.taxSimpleNationalPercent),
  };
}

export function mapAuxiliaryRow(
  kind: ServiceAuxiliaryKind,
  row: ServiceLaw116Code | ServiceNbsCode | MunicipalTaxCode,
): AuxiliaryCodeListRow {
  if (kind === "municipalTax") {
    const taxCode = row as MunicipalTaxCode;

    return {
      category: "",
      code: taxCode.cTribMun,
      defaultIssRate: toPercent(taxCode.defaultIssRate),
      description: taxCode.description,
      id: taxCode.id,
      municipalityIbgeCode: taxCode.municipalityIbgeCode,
      municipalityName: taxCode.municipalityName,
      stateCode: taxCode.stateCode,
      status: taxCode.status,
    };
  }

  if (kind === "nbs") {
    const nbsCode = row as ServiceNbsCode;

    return {
      category: nbsCode.category ?? "",
      code: nbsCode.code,
      description: nbsCode.description,
      id: nbsCode.id,
      status: nbsCode.status,
    };
  }

  const lawCode = row as ServiceLaw116Code;

  return {
    category: lawCode.category ?? "",
    code: lawCode.cTribNac,
    description: lawCode.description,
    id: lawCode.id,
    requiresConstruction: lawCode.requiresConstruction,
    requiresEvent: lawCode.requiresEvent,
    requiresProperty: lawCode.requiresProperty,
    status: lawCode.status,
  };
}

function emptyAuxiliaryCode(): AuxiliaryCodeFormValues {
  return {
    category: "",
    code: "",
    defaultIssRate: "0,00",
    description: "",
    id: null,
    municipalityIbgeCode: "",
    municipalityName: "",
    stateCode: "",
    requiresConstruction: false,
    requiresEvent: false,
    requiresProperty: false,
    status: "ACTIVE",
  };
}

export function mapAuxiliaryFormValues(
  kind: ServiceAuxiliaryKind,
  row: ServiceLaw116Code | ServiceNbsCode | MunicipalTaxCode | null,
): AuxiliaryCodeFormValues {
  if (!row) {
    return emptyAuxiliaryCode();
  }

  if (kind === "municipalTax") {
    const taxCode = row as MunicipalTaxCode;

    return {
      ...emptyAuxiliaryCode(),
      code: taxCode.cTribMun,
      defaultIssRate: toDecimalInputFixed(taxCode.defaultIssRate),
      description: taxCode.description,
      id: taxCode.id,
      municipalityIbgeCode: taxCode.municipalityIbgeCode,
      municipalityName: taxCode.municipalityName,
      stateCode: taxCode.stateCode,
      status: taxCode.status,
    };
  }

  if (kind === "nbs") {
    const nbsCode = row as ServiceNbsCode;

    return {
      ...emptyAuxiliaryCode(),
      category: nbsCode.category ?? "",
      code: nbsCode.code,
      description: nbsCode.description,
      id: nbsCode.id,
      status: nbsCode.status,
    };
  }

  const lawCode = row as ServiceLaw116Code;

  return {
    ...emptyAuxiliaryCode(),
    category: lawCode.category ?? "",
    code: lawCode.cTribNac,
    description: lawCode.description,
    id: lawCode.id,
    requiresConstruction: lawCode.requiresConstruction,
    requiresEvent: lawCode.requiresEvent,
    requiresProperty: lawCode.requiresProperty,
    status: lawCode.status,
  };
}

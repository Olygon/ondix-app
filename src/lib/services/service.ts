import "server-only";

import {
  type ServiceAuxiliaryKind,
} from "@/features/services/constants/service-constants";
import type {
  AuxiliaryCodeFormPageData,
  AuxiliaryCodeFormValues,
  AuxiliaryCodeListPageData,
  ProvidedServiceFormPageData,
  ProvidedServiceFormValues,
  ProvidedServiceListPageData,
} from "@/features/services/types/service-types";
import {
  getAuxiliaryCodeFormPageData as getAuxiliaryCodeFormPageDataFromQueries,
  getAuxiliaryCodeListPageData as getAuxiliaryCodeListPageDataFromQueries,
  getProvidedServiceFormPageData as getProvidedServiceFormPageDataFromQueries,
  getProvidedServiceListPageData as getProvidedServiceListPageDataFromQueries,
  type ServiceSearchParams,
} from "@/features/services/server/queries";
import {
  deleteProvidedService as deleteProvidedServiceFromMutations,
  deleteServiceMunicipalTaxRule as deleteServiceMunicipalTaxRuleFromMutations,
  inactivateAuxiliaryCode as inactivateAuxiliaryCodeFromMutations,
  saveProvidedService as saveProvidedServiceFromMutations,
  saveAuxiliaryCode as saveAuxiliaryCodeFromMutations,
  saveServiceMunicipalTaxRule as saveServiceMunicipalTaxRuleFromMutations,
} from "@/features/services/server/mutations";
export { parseServiceAuxiliaryKind } from "@/features/services/server/helpers";
export type { ServiceSearchParams } from "@/features/services/server/queries";

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

export async function getProvidedServiceListPageData(
  searchParams?: ServiceSearchParams,
): Promise<ProvidedServiceListPageData> {
  return getProvidedServiceListPageDataFromQueries(searchParams);
}

export async function getProvidedServiceFormPageData(
  serviceId?: string,
): Promise<ProvidedServiceFormPageData> {
  return getProvidedServiceFormPageDataFromQueries(serviceId);
}

export async function saveProvidedService(input: ProvidedServiceWriteInput) {
  return saveProvidedServiceFromMutations(input);
}

export async function deleteProvidedService(serviceId: string) {
  return deleteProvidedServiceFromMutations(serviceId);
}

export async function saveServiceMunicipalTaxRule(
  input: ServiceMunicipalTaxRuleWriteInput,
) {
  return saveServiceMunicipalTaxRuleFromMutations(input);
}

export async function deleteServiceMunicipalTaxRule(serviceId: string, ruleId: string) {
  return deleteServiceMunicipalTaxRuleFromMutations(serviceId, ruleId);
}

export async function getAuxiliaryCodeListPageData(
  kind: ServiceAuxiliaryKind,
  searchParams?: ServiceSearchParams,
): Promise<AuxiliaryCodeListPageData> {
  return getAuxiliaryCodeListPageDataFromQueries(kind, searchParams);
}

export async function getAuxiliaryCodeFormPageData(
  kind: ServiceAuxiliaryKind,
  auxiliaryCodeId?: string,
): Promise<AuxiliaryCodeFormPageData> {
  return getAuxiliaryCodeFormPageDataFromQueries(kind, auxiliaryCodeId);
}

export async function saveAuxiliaryCode(
  kind: ServiceAuxiliaryKind,
  input: AuxiliaryCodeWriteInput,
) {
  return saveAuxiliaryCodeFromMutations(kind, input);
}

export async function inactivateAuxiliaryCode(
  kind: ServiceAuxiliaryKind,
  auxiliaryCodeId: string,
) {
  return inactivateAuxiliaryCodeFromMutations(kind, auxiliaryCodeId);
}

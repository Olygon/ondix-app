import "server-only";

import type { CustomerWriteInput } from "@/features/customers/server/helpers";
import {
  deleteCustomer as deleteCustomerFromMutations,
  saveCustomer as saveCustomerFromMutations,
} from "@/features/customers/server/mutations";
import {
  getCustomerFormPageData as getCustomerFormPageDataFromQueries,
  getCustomerListPageData as getCustomerListPageDataFromQueries,
} from "@/features/customers/server/queries";
import type {
  CustomerFormPageData,
  CustomerListPageData,
} from "@/features/customers/types/customer-types";
import type { CustomerSearchParams } from "@/features/customers/server/queries";

export type { CustomerSearchParams } from "@/features/customers/server/queries";

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
  return saveCustomerFromMutations(input);
}

export async function deleteCustomer(customerId: string) {
  return deleteCustomerFromMutations(customerId);
}

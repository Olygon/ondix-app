export type CustomerCollectionActionState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export type CustomerFormActionState = CustomerCollectionActionState & {
  fieldErrors?: Record<string, string[] | undefined>;
  savedCustomerId?: string;
};

export const initialCustomerCollectionActionState: CustomerCollectionActionState = {
  status: "idle",
};

export const initialCustomerFormActionState: CustomerFormActionState = {
  status: "idle",
};

export type ServiceCollectionActionState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export type ServiceFormActionState = ServiceCollectionActionState & {
  fieldErrors?: Record<string, string[] | undefined>;
  savedId?: string;
};

export const initialServiceCollectionActionState: ServiceCollectionActionState = {
  status: "idle",
};

export const initialServiceFormActionState: ServiceFormActionState = {
  status: "idle",
};

export type SubscriberCompanyActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialSubscriberCompanyActionState: SubscriberCompanyActionState = {
  status: "idle",
};

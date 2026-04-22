export type SubscriptionActionState = {
  message?: string;
  paymentAttemptId?: string;
  status: "idle" | "error" | "success";
};

export const initialSubscriptionActionState: SubscriptionActionState = {
  status: "idle",
};

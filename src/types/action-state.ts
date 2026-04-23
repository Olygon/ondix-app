export type ActionStateStatus = "idle" | "error" | "success";

export type ActionFieldErrors = Record<string, string[] | undefined>;

export type ActionState<Extra extends object = object> = {
  fieldErrors?: ActionFieldErrors;
  message?: string;
  status: ActionStateStatus;
} & Extra;

export type ActionCollectionState<Extra extends object = object> = {
  message?: string;
  status: ActionStateStatus;
} & Extra;

export const initialActionState = {
  status: "idle",
} satisfies ActionState;

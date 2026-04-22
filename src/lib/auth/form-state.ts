export type AuthActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  preview?: {
    email: string;
    expiresAt: string;
    loginLink: string;
    temporaryPassword: string;
  } | null;
  status: "error" | "idle" | "success";
};

export const initialAuthActionState: AuthActionState = {
  status: "idle",
};

export type CustomerCertificateActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  status: "idle" | "error" | "success";
  uploadLink?: string;
  whatsappUrl?: string;
};

export const initialCustomerCertificateActionState: CustomerCertificateActionState = {
  status: "idle",
};

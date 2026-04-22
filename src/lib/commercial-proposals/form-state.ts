export type CommercialProposalFieldErrors = Record<string, string[] | undefined>;

export type CommercialProposalActionState = {
  fieldErrors?: CommercialProposalFieldErrors;
  message: string;
  savedId?: string;
  status: "idle" | "success" | "error";
};

export const initialCommercialProposalActionState: CommercialProposalActionState = {
  message: "",
  status: "idle",
};

export type CommercialProposalCollectionActionState = {
  message: string;
  status: "idle" | "success" | "error";
};

export const initialCommercialProposalCollectionActionState:
  CommercialProposalCollectionActionState = {
    message: "",
    status: "idle",
  };

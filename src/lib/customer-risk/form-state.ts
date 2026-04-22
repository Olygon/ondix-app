export type RiskActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  riskAnalysisId?: string;
  status: "idle" | "error" | "success";
};

export const initialRiskActionState: RiskActionState = {
  status: "idle",
};

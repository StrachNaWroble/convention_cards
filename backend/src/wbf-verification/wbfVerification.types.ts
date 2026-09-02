export type WbfVerificationStatus = "found" | "not_found" | "unavailable";

export type WbfVerificationConfidence = "high" | "medium" | "low";

export type WbfVerificationResult = {
  status: WbfVerificationStatus;
  wbfNumber: string;
  playerName?: string;
  countryOrNbo?: string;
  sourceUrl?: string;
  checkedAt: Date;
  confidence: WbfVerificationConfidence;
};

export type WbfVerificationService = {
  verifyWbfNumber(wbfNumber: string): Promise<WbfVerificationResult>;
};

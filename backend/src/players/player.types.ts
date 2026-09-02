export type VerificationStatus = "pending" | "verified" | "unverified" | "failed";

export type Player = {
  id: string;
  authUserId: string;
  wbfNumber: string;
  email: string;
  displayName: string | null;
  countryOrNbo: string | null;
  verificationStatus: VerificationStatus;
  verificationSource: string | null;
  verificationCheckedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePlayerInput = {
  authUserId: string;
  wbfNumber: string;
  email: string;
  displayName?: string | null;
  countryOrNbo?: string | null;
  verificationStatus?: VerificationStatus;
  verificationSource?: string | null;
  verificationCheckedAt?: Date | null;
};

export type UpdatePlayerProfileInput = {
  displayName?: string | null;
  countryOrNbo?: string | null;
};

export function normalizeWbfNumber(wbfNumber: string): string {
  return wbfNumber.trim().replace(/\s+/g, "");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

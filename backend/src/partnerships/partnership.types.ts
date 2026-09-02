export type PartnershipStatus = "pending" | "approved" | "declined" | "archived";

export type Partnership = {
  id: string;
  ownerPlayerId: string;
  partnerPlayerId: string | null;
  partnerWbfNumber: string;
  status: PartnershipStatus;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePartnershipInput = {
  ownerPlayerId: string;
  ownerWbfNumber: string;
  partnerWbfNumber: string;
};

export type CreatePartnershipRecordInput = {
  ownerPlayerId: string;
  partnerPlayerId?: string | null;
  partnerWbfNumber: string;
};

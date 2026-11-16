// Older invitation history can still contain former roles; new invitations are Staff only.
export type InvitationRole = "manager" | "staff" | "expert";
export type CreateInvitationInput = { email: string; role: "staff" };
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired" | "delivery_failed" | "declined";

export type ReceivedInvitation = { id: string; organizationName: string; role: "staff"; expiresAt: string };

export type OrganizationMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  isActive: boolean;
};

export type OrganizationInvitation = {
  _id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
};

export type InvitationPreview = {
  organizationName: string;
  email: string;
  role: InvitationRole;
  expiresAt: string;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};

export type MemberSubscription = {
  status: string;
  plan: { name?: string; code?: string } | null;
  members: { count: number; pending: number; limit: number; available: number };
};

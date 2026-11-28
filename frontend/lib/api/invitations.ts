import { apiClient, apiRequest } from "@/lib/api/client";
import type { AuthSession } from "@/types/auth";
import type { CreateInvitationInput, InvitationPreview, MemberSubscription, OrganizationInvitation, OrganizationMember, PageResult, ReceivedInvitation } from "@/types/invitations";

type PaginatedResponse<T> = { data: T[]; meta: { page: number; total: number; totalPages?: number; limit: number } };

async function list<T>(url: string, page: number): Promise<PageResult<T>> {
  const response = await apiClient.get<PaginatedResponse<T>>(url, { params: { page, limit: 20 } });
  const { data, meta } = response.data;
  return { items: data, total: meta.total, page: meta.page, pages: meta.totalPages ?? Math.max(1, Math.ceil(meta.total / meta.limit)) };
}

export const invitationsApi = {
  received(signal?: AbortSignal) {
    return apiRequest<ReceivedInvitation[]>({ url: "/invitations/received", signal });
  },
  acceptReceived(invitationId: string) {
    return apiRequest<AuthSession>({ url: "/invitations/accept", method: "POST", data: { invitationId } });
  },
  declineReceived(invitationId: string) {
    return apiRequest<{ declined: boolean }>({ url: "/invitations/received", method: "POST", data: { invitationId } });
  },
  members(orgId: string, page = 1) {
    return list<OrganizationMember>(`/organizations/${orgId}/members`, page);
  },
  removeMember(orgId: string, userId: string) {
    return apiRequest<void>({ url: `/organizations/${orgId}/members/${userId}`, method: "DELETE" });
  },
  invitations(orgId: string, page = 1) {
    return list<OrganizationInvitation>(`/organizations/${orgId}/invitations`, page);
  },
  subscription(orgId: string) {
    return apiRequest<MemberSubscription>({ url: `/organizations/${orgId}/subscription` });
  },
  create(orgId: string, input: CreateInvitationInput) {
    return apiRequest<OrganizationInvitation>({ url: `/organizations/${orgId}/invitations`, method: "POST", data: input });
  },
  revoke(orgId: string, invitationId: string) {
    return apiRequest<OrganizationInvitation>({ url: `/organizations/${orgId}/invitations/${invitationId}`, method: "DELETE" });
  },
  preview(token: string) {
    return apiRequest<InvitationPreview>({ url: "/invitations/preview", method: "POST", data: { token } });
  },
  accept(token: string) {
    return apiRequest<AuthSession>({ url: "/invitations/accept", method: "POST", data: { token } });
  },
};

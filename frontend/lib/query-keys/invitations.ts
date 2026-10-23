export const invitationKeys = {
  received: ["received-invitations"] as const,
  membersBase: (orgId: string) => ["org-members", orgId] as const,
  members: (orgId: string, page: number) => ["org-members", orgId, page] as const,
  invitationsBase: (orgId: string) => ["org-invitations", orgId] as const,
  invitations: (orgId: string, page: number) => ["org-invitations", orgId, page] as const,
  subscription: (orgId: string) => ["org-subscription", orgId] as const,
  preview: (token: string) => ["invitation-preview", token] as const,
};

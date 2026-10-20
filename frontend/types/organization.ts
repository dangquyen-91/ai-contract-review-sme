export type CreateOrganizationInput = {
  name: string;
  taxCode?: string;
  address?: string;
};

export type Organization = {
  id: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

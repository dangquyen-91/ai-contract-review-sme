export type CreateOrganizationInput = {
  name: string;
  taxCode: string;
  industry: string;
  addressDetails: { provinceCode: string; wardCode: string; addressLine: string };
};

export type VietnamAddressDirectory = {
  source: string;
  retrievedAt: string;
  administrativeLevels: number;
  provinces: { code: string; name: string; wards: { code: string; name: string }[] }[];
};

export type Organization = {
  id: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  industry?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationListResult = {
  items: Organization[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrganizationListFilters = {
  search?: string;
  industry?: string;
};

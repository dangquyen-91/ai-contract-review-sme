export type ManagedUserRole = "administrator" | "user" | "owner" | "manager" | "staff" | "expert";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
  organization: { id: string; name: string } | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
};

export type UserListParams = {
  search: string;
  role: ManagedUserRole | "";
  status: "active" | "inactive" | "";
  page: number;
  limit: number;
};

export type ManagedUserList = {
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
};

export type UpdateManagedUserInput = Partial<Pick<ManagedUser, "name" | "email" | "role" | "isActive">>;
export type CreateManagedUserInput = Pick<ManagedUser, "name" | "email" | "isActive"> & {
  role: "user" | "administrator";
  password: string;
};

export type SaveManagedUserInput =
  | { id: string; data: UpdateManagedUserInput }
  | { id?: never; data: CreateManagedUserInput };

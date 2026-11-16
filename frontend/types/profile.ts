import type { AuthUser } from './auth';

export type Profile = {
  user: AuthUser & {
    phone: string; createdAt: string; emailVerified: boolean;
    googleLinked: boolean; hasPassword: boolean | null;
  };
  organization: { id: string; name: string; isPersonal: boolean } | null;
};
export type ProfileUpdate = { name: string; phone: string };

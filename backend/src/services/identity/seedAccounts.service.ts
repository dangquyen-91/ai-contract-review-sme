import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { getRoleByCode, seedDefaultRoles } from './role.service';

export const SEED_ORGANIZATION_ID = new Types.ObjectId('000000000000000000000001');
export const SEED_ACCOUNTS = [
  { email: 'manager@example.com', name: 'Demo Manager', role: 'manager' },
  { email: 'admin@example.com', name: 'Demo Administrator', role: 'administrator' },
  { email: 'expert@example.com', name: 'Demo Expert', role: 'expert' },
  { email: 'owner@example.com', name: 'Demo Owner', role: 'owner' },
  { email: 'user@example.com', name: 'Demo User', role: 'user' }

] as const;

export async function seedAccounts(password: string) {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Seed password must be at least 12 characters and at most 72 UTF-8 bytes');
  }

  await seedDefaultRoles();
  await UserModel.init();
  await OrganizationModel.updateOne(
    { _id: SEED_ORGANIZATION_ID },
    { $setOnInsert: { name: 'Demo SME', isPersonal: false } },
    { upsert: true },
  );

  const passwordHash = await bcrypt.hash(password, 10);
  const results = [];
  for (const account of SEED_ACCOUNTS) {
    const role = await getRoleByCode(account.role);
    const result = await UserModel.updateOne(
      { email: account.email },
      {
        $setOnInsert: {
          email: account.email,
          name: account.name,
          roleId: role._id,
          ...(account.role !== 'administrator' ? { orgId: SEED_ORGANIZATION_ID } : {}),
          passwordHash,
          isActive: true,
          hasCompletedOnboarding: true,
          emailVerifiedAt: new Date(),
        },
      },
      { upsert: true, runValidators: true },
    );
    results.push({
      email: account.email,
      role: account.role,
      status: result.upsertedCount ? 'created' : 'already exists (unchanged)',
    });
  }
  return results;
}

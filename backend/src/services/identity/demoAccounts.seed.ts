import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { MembershipModel } from '../../models/membership.model';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';
import { RoleCode } from '../../models/role.model';
import { registerSchema } from '../../validations/auth.validation';
import { seedDefaultRoles } from './role.service';

const demoId = (key: string) =>
  new Types.ObjectId(
    createHash('sha256').update(`lawscan-demo-accounts:v1:${key}`).digest('hex').slice(0, 24),
  );

export const DEMO_ORGANIZATION_ID = demoId('organization');
export const DEMO_ACCOUNTS = [
  { role: 'administrator', email: 'admin@demo.lawscan.test', name: 'Demo Administrator' },
  { role: 'owner', email: 'owner@demo.lawscan.test', name: 'Demo Owner' },
  { role: 'staff', email: 'staff@demo.lawscan.test', name: 'Demo Staff' },
  { role: 'expert', email: 'expert@demo.lawscan.test', name: 'Demo Expert' },
  { role: 'manager', email: 'manager@demo.lawscan.test', name: 'Demo Manager' },
  { role: 'user', email: 'user@demo.lawscan.test', name: 'Demo User' },
] as const satisfies ReadonlyArray<{ role: RoleCode; email: string; name: string }>;

export async function seedDemoAccounts(password: string) {
  registerSchema.shape.password.parse(password);
  const passwordHash = await bcrypt.hash(password, 10);
  await seedDefaultRoles();
  // Initialize collections before the transaction, including on an empty DB.
  await Promise.all([UserModel.init(), MembershipModel.init(), OrganizationModel.init()]);

  return mongoose.connection.transaction(async (session) => {
    const ownerId = demoId('owner');
    const existingOwner = await MembershipModel.findOne({
      orgId: DEMO_ORGANIZATION_ID,
      role: 'owner',
    }).session(session);
    if (existingOwner && !existingOwner.userId.equals(ownerId)) {
      throw new Error('Tổ chức demo có Owner khác; seed không thay đổi quyền của tài khoản đó.');
    }
    await OrganizationModel.updateOne(
      { _id: DEMO_ORGANIZATION_ID },
      { $setOnInsert: { name: 'LawScan Demo' } },
      { upsert: true, session },
    );

    const accounts = [];
    for (const definition of DEMO_ACCOUNTS) {
      const userId = demoId(definition.role);
      let user = await UserModel.findOne({
        $or: [{ _id: userId }, { email: definition.email }],
      }).session(session);
      const created = !user;
      const platformRole = ['administrator', 'manager', 'expert'].includes(definition.role)
        ? (definition.role as 'administrator' | 'manager' | 'expert')
        : undefined;
      if (user && (!user._id.equals(userId) || user.email !== definition.email)) {
        throw new Error(`Email hoặc ID demo đã thuộc tài khoản khác: ${definition.email}`);
      }
      if (
        user &&
        (user.platformRole !== platformRole ||
          !user.isActive ||
          user.deletedAt ||
          !user.emailVerifiedAt)
      ) {
        throw new Error(
          `Tài khoản demo đã đổi trạng thái hoặc quyền; seed giữ nguyên: ${definition.email}`,
        );
      }
      if (!user) {
        [user] = await UserModel.create(
          [
            {
              _id: userId,
              email: definition.email,
              name: definition.name,
              passwordHash,
              hasPassword: true,
              platformRole,
              isActive: true,
              emailVerifiedAt: new Date(),
              hasCompletedOnboarding: true,
            },
          ],
          { session },
        );
      }
      const membership = await MembershipModel.findOne({ userId }).session(session);
      if (definition.role === 'owner' || definition.role === 'staff') {
        if (
          membership &&
          (!membership.orgId.equals(DEMO_ORGANIZATION_ID) || membership.role !== definition.role)
        ) {
          throw new Error(
            `Tài khoản demo đang thuộc tổ chức hoặc vai trò khác: ${definition.email}`,
          );
        }
        if (!membership) {
          await MembershipModel.create(
            [
              {
                userId,
                orgId: DEMO_ORGANIZATION_ID,
                role: definition.role,
                ...(definition.role === 'staff' ? { invitedBy: ownerId } : {}),
              },
            ],
            { session },
          );
          await UserModel.updateOne(
            { _id: userId },
            { $inc: { permissionsVersion: 1 } },
            { session },
          );
        }
      } else if (membership) {
        throw new Error(`Tài khoản demo có membership ngoài phạm vi: ${definition.email}`);
      }
      accounts.push({
        role: definition.role,
        email: definition.email,
        userId: String(userId),
        created,
      });
    }
    return {
      organizationId: String(DEMO_ORGANIZATION_ID),
      organizationName: 'LawScan Demo',
      accounts,
    };
  });
}

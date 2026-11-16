import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import mongoose, { FilterQuery, HydratedDocument } from 'mongoose';
import { User, UserModel } from '../models/user.model';
import { MembershipModel } from '../models/membership.model';
import { accessOf, AccountAccess } from '../services/identity/account.service';
import { AppError } from '../errors/AppError';
import {
  createUserBody,
  listUsersQuery,
  updateUserBody,
} from '../validations/userManagement.validation';

const selection =
  '_id name email platformRole isActive emailVerifiedAt createdAt updatedAt permissionsVersion';

type ManagedUser = HydratedDocument<User>;
type UserView = { user: ManagedUser; access: AccountAccess; organizationName: string | null };

async function withAccess(users: ManagedUser[]): Promise<UserView[]> {
  const memberships = await MembershipModel.find({ userId: { $in: users.map((user) => user._id) } })
    .populate<{ orgId: { _id: unknown; name: string } | null }>('orgId', 'name')
    .lean();
  const byUser = new Map(
    memberships.map((membership) => [membership.userId.toString(), membership]),
  );
  return users.map((user) => {
    const membership = byUser.get(user.id);
    const organization = membership?.orgId ?? null;
    return {
      user,
      access: accessOf(
        user,
        membership && organization ? { orgId: organization._id, role: membership.role } : null,
      ),
      organizationName: organization?.name ?? null,
    };
  });
}

async function findManagedUser(id: string) {
  const user = await UserModel.findOne({ _id: id, deletedAt: null }).select(selection);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng.');
  const [view] = await withAccess([user]);
  return view;
}

function serialize({ user, access, organizationName }: UserView) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: access.role,
    organization: access.orgId ? { id: access.orgId, name: organizationName ?? '' } : null,
    isActive: user.isActive,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
  };
}

async function roleFilter(role: string): Promise<FilterQuery<User>> {
  if (role === 'owner' || role === 'staff') {
    return { _id: { $in: await MembershipModel.distinct('userId', { role }) } };
  }
  if (role === 'user') {
    return { platformRole: null, _id: { $nin: await MembershipModel.distinct('userId') } };
  }
  return { platformRole: role };
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, role, status, page, limit } = listUsersQuery.parse(req.query);
    const filter: FilterQuery<User> = { deletedAt: null, ...(role ? await roleFilter(role) : {}) };
    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
      ];
    }
    if (status) filter.isActive = status === 'active';
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select(selection)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);
    const views = await withAccess(users);
    res.json({ success: true, data: { users: views.map(serialize), total, page, limit } });
  } catch (error) {
    next(error);
  }
}
export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: serialize(await findManagedUser(req.params.id)) });
  } catch (error) {
    next(error);
  }
}
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserBody.parse(req.body);
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      platformRole: input.role === 'user' ? null : input.role,
      hasCompletedOnboarding: input.role !== 'user',
      isActive: input.isActive,
    });
    res.status(201).json({ success: true, data: serialize(await findManagedUser(user.id)) });
  } catch (error) {
    next(error);
  }
}
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateUserBody.parse(req.body);
    const { user, access } = await findManagedUser(req.params.id);
    const roleChanged = input.role !== undefined && input.role !== access.role;
    if (user.id === req.user!.sub && (input.isActive === false || roleChanged))
      throw AppError.conflict('Bạn không thể tự khóa hoặc thay đổi vai trò của mình.');
    if (access.role === 'owner' && (input.isActive === false || roleChanged))
      throw AppError.conflict(
        'Cần chuyển quyền sở hữu tổ chức trước khi thay đổi tài khoản owner.',
      );
    const changes: Record<string, unknown> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.email !== undefined) {
      changes.email = input.email;
      if (input.email !== user.email) changes.emailVerifiedAt = null;
    }
    if (input.isActive !== undefined) changes.isActive = input.isActive;
    if (roleChanged) {
      if (
        access.membership ||
        (input.role !== 'user' && !['administrator', 'manager', 'expert'].includes(input.role!))
      )
        throw AppError.badRequest(
          'Vai trò không phù hợp với tổ chức hiện tại. Hãy dùng quy trình thành viên để thay đổi tổ chức.',
        );
      changes.platformRole = input.role === 'user' ? null : input.role;
      if (input.role !== 'user') changes.hasCompletedOnboarding = true;
    }
    const updated = await UserModel.findOneAndUpdate(
      { _id: user._id, deletedAt: null, permissionsVersion: user.permissionsVersion },
      { $set: changes, $inc: { permissionsVersion: 1 } },
      { new: true, runValidators: true },
    ).select(selection);
    if (!updated) throw AppError.conflict('Tài khoản vừa thay đổi. Vui lòng tải lại.');
    const [view] = await withAccess([updated]);
    res.json({ success: true, data: serialize(view) });
  } catch (error) {
    next(error);
  }
}
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, access } = await findManagedUser(req.params.id);
    if (user.id === req.user!.sub) throw AppError.conflict('Bạn không thể xóa tài khoản của mình.');
    if (access.role === 'owner')
      throw AppError.conflict('Cần chuyển quyền sở hữu tổ chức trước khi xóa tài khoản owner.');
    await mongoose.connection.transaction(async (session) => {
      // Preserve references from contracts, reviews and audit records.
      const result = await UserModel.updateOne(
        { _id: user._id, deletedAt: null, permissionsVersion: user.permissionsVersion },
        { $set: { deletedAt: new Date(), isActive: false }, $inc: { permissionsVersion: 1 } },
        { session },
      );
      if (!result.modifiedCount)
        throw AppError.conflict('Tài khoản vừa thay đổi. Vui lòng tải lại.');
      await MembershipModel.deleteOne({ userId: user._id }, { session });
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

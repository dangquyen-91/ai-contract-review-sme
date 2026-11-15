import type { z } from 'zod';
import bcrypt from 'bcryptjs';
import { FilterQuery } from 'mongoose';
import { User, UserModel } from '../../models/user.model';
import { Role } from '../../models/role.model';
import { OrganizationModel } from '../../models/organization.model';
import { getRoleByCode } from './role.service';
import { AppError } from '../../errors/AppError';
import type {
  createUserBody,
  listUsersQuery,
  updateUserBody,
} from '../../validations/userManagement.validation';

const selection =
  '_id name email roleId orgId isActive emailVerifiedAt createdAt updatedAt permissionsVersion';
function queryUser(id: string) {
  return UserModel.findOne({ _id: id, deletedAt: null })
    .select(selection)
    .populate('roleId', 'code')
    .populate('orgId', 'name isPersonal');
}
function serialize(user: NonNullable<Awaited<ReturnType<typeof queryUser>>>) {
  const org = user.orgId as unknown as { _id: unknown; name: string } | null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.roleId as unknown as Role).code,
    organization: org ? { id: String(org._id), name: org.name } : null,
    isActive: user.isActive,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
  };
}
export async function listUsers({
  search,
  role,
  status,
  page,
  limit,
}: z.infer<typeof listUsersQuery>) {
  const filter: FilterQuery<User> = { deletedAt: null };
  if (search) {
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { email: { $regex: pattern, $options: 'i' } },
    ];
  }
  if (role) filter.roleId = (await getRoleByCode(role))._id;
  if (status) filter.isActive = status === 'active';
  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .select(selection)
      .populate('roleId', 'code')
      .populate('orgId', 'name isPersonal')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    UserModel.countDocuments(filter),
  ]);
  return { users: users.map(serialize), total, page, limit };
}
export async function getUser(id: string) {
  const user = await queryUser(id);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng.');
  return serialize(user);
}
export async function createUser(input: z.infer<typeof createUserBody>) {
  const role = await getRoleByCode(input.role);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
    roleId: role._id,
    isActive: input.isActive,
  });
  return serialize((await queryUser(user.id))!);
}
export async function updateUser(
  actorId: string,
  id: string,
  input: z.infer<typeof updateUserBody>,
) {
  const user = await queryUser(id);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng.');
  const oldRole = (user.roleId as unknown as Role).code;
  if (user.id === actorId && (input.isActive === false || (input.role && input.role !== oldRole)))
    throw AppError.conflict('Bạn không thể tự khóa hoặc thay đổi vai trò của mình.');
  if (oldRole === 'owner' && (input.isActive === false || (input.role && input.role !== oldRole)))
    throw AppError.conflict('Cần chuyển quyền sở hữu tổ chức trước khi thay đổi tài khoản owner.');
  const changes: Record<string, unknown> = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.email !== undefined) {
    changes.email = input.email;
    if (input.email !== user.email) changes.emailVerifiedAt = null;
  }
  if (input.isActive !== undefined) changes.isActive = input.isActive;
  if (input.role && input.role !== oldRole) {
    const org = user.orgId ? await OrganizationModel.findById(user.orgId) : null;
    const allowed =
      org && !org.isPersonal ? ['staff'] : ['user', 'administrator', 'manager', 'expert'];
    if (!allowed.includes(input.role))
      throw AppError.badRequest(
        'Vai trò không phù hợp với tổ chức hiện tại. Hãy dùng quy trình thành viên để thay đổi tổ chức.',
      );
    changes.roleId = (await getRoleByCode(input.role))._id;
    if (['administrator', 'manager', 'expert'].includes(input.role))
      changes.hasCompletedOnboarding = true;
  }
  const detach =
    input.role &&
    ['administrator', 'manager', 'expert'].includes(input.role) &&
    input.role !== oldRole &&
    user.orgId;
  const updated = await UserModel.findOneAndUpdate(
    { _id: user._id, deletedAt: null, permissionsVersion: user.permissionsVersion },
    { $set: changes, ...(detach ? { $unset: { orgId: 1 } } : {}), $inc: { permissionsVersion: 1 } },
    { new: true, runValidators: true },
  )
    .select(selection)
    .populate('roleId', 'code')
    .populate('orgId', 'name isPersonal');
  if (!updated) throw AppError.conflict('Tài khoản vừa thay đổi. Vui lòng tải lại.');
  return serialize(updated);
}
export async function deleteUser(actorId: string, id: string) {
  const user = await queryUser(id);
  if (!user) throw AppError.notFound('Không tìm thấy người dùng.');
  if (user.id === actorId) throw AppError.conflict('Bạn không thể xóa tài khoản của mình.');
  if ((user.roleId as unknown as Role).code === 'owner')
    throw AppError.conflict('Cần chuyển quyền sở hữu tổ chức trước khi xóa tài khoản owner.');
  // Preserve references from contracts, reviews and audit records.
  const result = await UserModel.updateOne(
    { _id: user._id, deletedAt: null, permissionsVersion: user.permissionsVersion },
    { $set: { deletedAt: new Date(), isActive: false }, $inc: { permissionsVersion: 1 } },
  );
  if (!result.modifiedCount) throw AppError.conflict('Tài khoản vừa thay đổi. Vui lòng tải lại.');
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import type { z } from 'zod';
import { UserModel } from '../../models/user.model';
import { OrganizationModel } from '../../models/organization.model';
import { AppError } from '../../errors/AppError';
import { toPublicUser } from '../../controllers/auth.controller';
import { profileUpdateSchema, changePasswordSchema } from '../../validations/profile.validation';
import { uploadAvatar, removeAvatar } from './avatar.service';

async function requireProfileUser(userId: string) {
  const user = await UserModel.findOne({ _id: userId, isActive: true })
    .select('+googleSubject +avatarPublicId')
    .populate('roleId');
  if (!user) throw AppError.unauthorized();
  return user;
}
export async function getProfile(userId: string) {
  const user = await requireProfileUser(userId);
  const organization = user.orgId
    ? await OrganizationModel.findById(user.orgId).select('name isPersonal')
    : null;
  return {
    user: {
      ...toPublicUser(user),
      phone: user.phone ?? '',
      createdAt: user.createdAt,
      // Legacy Google-linked accounts do not reliably record whether a password was set.
      hasPassword: user.hasPassword ?? (user.googleSubject ? null : true),
      googleLinked: Boolean(user.googleSubject),
    },
    organization: organization
      ? { id: organization.id, name: organization.name, isPersonal: organization.isPersonal }
      : null,
  };
}
export async function updateProfile(userId: string, input: z.infer<typeof profileUpdateSchema>) {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, isActive: true },
    { $set: { name: input.name, phone: input.phone } },
    { new: true, runValidators: true },
  );
  if (!user) throw AppError.unauthorized();
  return getProfile(userId);
}
export async function updateProfileAvatar(userId: string, file: Express.Multer.File) {
  const user = await requireProfileUser(userId);
  const uploaded = await uploadAvatar(file.buffer, file.mimetype);
  try {
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, isActive: true, avatarPublicId: user.avatarPublicId ?? null },
      { $set: uploaded },
      { new: true },
    );
    if (!updated) throw AppError.conflict('Ảnh đại diện đã thay đổi. Vui lòng tải lại trang.');
  } catch (error) {
    await removeAvatar(uploaded.avatarPublicId);
    throw error;
  }
  await removeAvatar(user.avatarPublicId);
  return getProfile(userId);
}
export async function deleteProfileAvatar(userId: string) {
  const user = await requireProfileUser(userId);
  const updated = await UserModel.updateOne(
    { _id: userId, isActive: true, avatarPublicId: user.avatarPublicId ?? null },
    { $unset: { avatarUrl: 1, avatarPublicId: 1 } },
  );
  if (!updated.matchedCount)
    throw AppError.conflict('Ảnh đại diện đã thay đổi. Vui lòng tải lại trang.');
  await removeAvatar(user.avatarPublicId);
  return getProfile(userId);
}
export async function changePassword(userId: string, input: z.infer<typeof changePasswordSchema>) {
  await mongoose.connection.transaction(async (session) => {
    const user = await UserModel.findOne({ _id: userId, isActive: true })
      .select('+passwordHash')
      .session(session);
    if (!user) throw AppError.unauthorized();
    if (user.hasPassword === false)
      throw AppError.badRequest('Hãy xác minh email để thiết lập mật khẩu.');
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash)))
      throw AppError.badRequest('Mật khẩu hiện tại chưa đúng.');
    if (await bcrypt.compare(input.newPassword, user.passwordHash))
      throw AppError.badRequest('Mật khẩu mới phải khác mật khẩu hiện tại.');
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: await bcrypt.hash(input.newPassword, 10), hasPassword: true },
        $inc: { authVersion: 1, permissionsVersion: 1 },
      },
      { session },
    );
  });
  return { changed: true };
}

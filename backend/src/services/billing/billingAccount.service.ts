import { ClientSession } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';

// Existing billing records use orgId as their scope key. For standalone personal
// accounts that key is the user ID; membership and User.orgId remain unchanged.
export async function findBillingAccount(
  id: string,
  session: ClientSession | null = null,
  lock = false,
) {
  const organization = lock
    ? await OrganizationModel.findByIdAndUpdate(id, { $inc: { __v: 1 } }, { new: true, session })
    : await OrganizationModel.findById(id).session(session);
  if (organization) return { isPersonal: organization.isPersonal, userId: null };

  const filter = { _id: id, orgId: null, isActive: true };
  const user = await (
    lock
      ? UserModel.findOneAndUpdate(filter, { $inc: { __v: 1 } }, { new: true, session })
      : UserModel.findOne(filter).session(session)
  ).populate('roleId');
  if (!user || (user.roleId as unknown as { code?: string })?.code !== 'user')
    throw AppError.notFound('Không tìm thấy tài khoản quản lý gói dịch vụ.');
  return { isPersonal: true, userId: user.id as string };
}

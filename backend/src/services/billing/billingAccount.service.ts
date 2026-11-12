import { ClientSession } from 'mongoose';
import { AppError } from '../../errors/AppError';
import { OrganizationModel } from '../../models/organization.model';
import { UserModel } from '../../models/user.model';

// Existing billing records use orgId as their scope key. For standalone personal
// accounts that key is the user ID.
export async function findBillingAccount(
  id: string,
  session: ClientSession | null = null,
  lock = false,
) {
  const organization = lock
    ? await OrganizationModel.findByIdAndUpdate(id, { $inc: { __v: 1 } }, { new: true, session })
    : await OrganizationModel.findById(id).session(session);
  if (organization) return { isPersonal: false, userId: null };

  const filter = { _id: id, isActive: true, platformRole: null };
  const user = await (lock
    ? UserModel.findOneAndUpdate(filter, { $inc: { __v: 1 } }, { new: true, session })
    : UserModel.findOne(filter).session(session));
  if (!user) throw AppError.notFound('Không tìm thấy tài khoản quản lý gói dịch vụ.');
  return { isPersonal: true, userId: user.id as string };
}

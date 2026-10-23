import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { UserModel } from '../../models/user.model';
import { googleLoginSchema } from '../../validations/auth.validation';
import { getPendingInvitation } from '../organization/invitation.service';
import { getRoleByCode } from './role.service';
import { tokensForUser } from './auth.service';

const client = new OAuth2Client();

export async function googleLogin(input: z.infer<typeof googleLoginSchema>) {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError('Google sign-in is not configured', 503);
  const ticket = await client
    .verifyIdToken({
      idToken: input.credential,
      audience: env.GOOGLE_CLIENT_ID,
    })
    .catch(() => {
      throw AppError.unauthorized('Invalid Google credential');
    });
  const payload = ticket.getPayload();
  if (
    !payload?.sub ||
    !payload.email ||
    !payload.email_verified ||
    (payload as unknown as { nonce?: string }).nonce !== input.nonce
  ) {
    throw AppError.unauthorized('Invalid Google credential');
  }
  const email = payload.email.trim().toLowerCase();
  // Third-party email ownership is not guaranteed by Google's email_verified alone.
  if (!email.endsWith('@gmail.com') && !payload.hd) {
    throw AppError.forbidden('Use email and password to verify this email address');
  }
  if (input.invitationToken) await getPendingInvitation(input.invitationToken, email);

  let user = await UserModel.findOne({ googleSubject: payload.sub })
    .select('+googleSubject')
    .populate('roleId');
  if (user && user.email !== email) {
    throw AppError.conflict('Google email changed. Sign in with your existing email instead.');
  }
  if (!user) {
    user = await UserModel.findOne({ email }).select('+googleSubject').populate('roleId');
    if (user) {
      if (!user.isActive) throw AppError.unauthorized('Invalid credentials');
      // Do not let an unverified pre-registration inherit Google ownership and keep an attacker's password.
      if (!user.emailVerifiedAt)
        throw AppError.conflict(
          'Verify your existing account by signing in with email and password first',
        );
      if (user.googleSubject && user.googleSubject !== payload.sub) {
        throw AppError.conflict('This email is linked to another Google account');
      }
      const linked = await UserModel.findOneAndUpdate(
        {
          _id: user._id,
          isActive: true,
          $or: [{ googleSubject: { $exists: false } }, { googleSubject: payload.sub }],
        },
        { $set: { googleSubject: payload.sub, hasPassword: user.hasPassword ?? true } },
        { new: true },
      ).populate('roleId');
      if (!linked) throw AppError.conflict('Account changed. Please sign in again.');
      user = linked;
    } else {
      const role = await getRoleByCode('user');
      try {
        user = await UserModel.create({
          email,
          name: (payload.name || email.split('@')[0]).slice(0, 100),
          googleSubject: payload.sub,
          hasPassword: false,
          emailVerifiedAt: new Date(),
          // A Google-only account has no user-known password; existing password auth stays unchanged.
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          roleId: role._id,
        });
        await user.populate('roleId');
      } catch (error) {
        if ((error as { code?: number }).code === 11000)
          throw AppError.conflict('Account was created concurrently. Please sign in again.');
        throw error;
      }
    }
  }
  if (!user.isActive || !user.emailVerifiedAt) throw AppError.unauthorized('Invalid credentials');
  return { user, ...tokensForUser(user, input.remember === true) };
}

import type { EmailVerificationChallenge } from "@/types/auth";

export const emailVerificationCookie = "lawscan_email_verification";
export const emailVerificationCookieAge = 60 * 60;

export function encodeEmailVerification(challenge: EmailVerificationChallenge, now = Date.now()) {
  return Buffer.from(JSON.stringify({ challenge, receivedAt: now }), "utf8").toString("base64url");
}

export function decodeEmailVerification(value?: string, now = Date.now()): EmailVerificationChallenge | null {
  if (!value) return null;
  try {
    const { challenge, receivedAt } = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      !challenge || challenge.verificationRequired !== true
      || typeof challenge.challengeId !== "string" || !/^[a-f\d]{64}$/.test(challenge.challengeId)
      || typeof challenge.email !== "string" || !challenge.email
      || typeof challenge.expiresAt !== "string" || !Number.isFinite(Date.parse(challenge.expiresAt))
      || !Number.isFinite(challenge.resendAfterSeconds) || challenge.resendAfterSeconds < 0
      || !Number.isFinite(receivedAt) || receivedAt > now || now - receivedAt >= emailVerificationCookieAge * 1000
    ) return null;
    return {
      ...challenge,
      resendAfterSeconds: Math.max(0, challenge.resendAfterSeconds - Math.floor((now - receivedAt) / 1000)),
    };
  } catch {
    return null;
  }
}

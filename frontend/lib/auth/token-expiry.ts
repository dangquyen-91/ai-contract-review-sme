/** Read the expiry of a JWT received from the backend; signature validation stays there. */
export function tokenMaxAge(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    if (typeof payload.exp !== "number") return 0;
    return Math.max(0, Math.floor(payload.exp - Date.now() / 1000));
  } catch {
    return 0;
  }
}

export function rememberedCookieAge(remember: boolean, refreshToken?: string) {
  return remember && refreshToken ? { maxAge: tokenMaxAge(refreshToken) } : {};
}

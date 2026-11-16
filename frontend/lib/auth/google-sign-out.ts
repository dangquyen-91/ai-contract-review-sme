export function disableGoogleAutoSelect() {
  if (typeof window === "undefined") return;
  const google = (window as Window & {
    google?: { accounts?: { id?: { disableAutoSelect?: () => void } } };
  }).google;
  try {
    google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    // Google may be blocked or unavailable; LawScan logout must still complete.
  }
}

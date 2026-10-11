const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function vietnamCalendarMonth(now: Date) {
  const local = new Date(now.getTime() + VN_OFFSET_MS);
  return {
    startsAt: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - VN_OFFSET_MS),
    endsAt: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - VN_OFFSET_MS),
  };
}

// One calendar month in Vietnam, clamping e.g. January 31 to February 28/29.
export function addSubscriptionMonth(start: Date) {
  const local = new Date(start.getTime() + VN_OFFSET_MS);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return new Date(local.getTime() - VN_OFFSET_MS);
}

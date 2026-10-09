export function getRemainingCalendarDays(
  expiresAt: string | Date | null | undefined,
): number | null {
  if (!expiresAt) {
    return null;
  }

  const expiration = new Date(expiresAt);
  if (Number.isNaN(expiration.getTime())) {
    return null;
  }

  const today = new Date();
  expiration.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((expiration.getTime() - today.getTime()) / millisecondsPerDay);
}

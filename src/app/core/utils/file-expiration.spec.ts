import { getRemainingCalendarDays } from './file-expiration';

describe('getRemainingCalendarDays', () => {
  it('returns null for missing and invalid dates', () => {
    expect(getRemainingCalendarDays(null)).toBeNull();
    expect(getRemainingCalendarDays(undefined)).toBeNull();
    expect(getRemainingCalendarDays('invalid')).toBeNull();
  });

  it('compares calendar days without depending on the current time', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(getRemainingCalendarDays(tomorrow)).toBe(1);
  });
});

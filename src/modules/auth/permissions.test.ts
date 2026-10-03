import { describe, expect, it } from 'vitest';
import { canAccessPath, canSeeNavPath, homeForRole } from './permissions';

describe('staff RBAC', () => {
  it('sends Support to Clients, never Dashboard or Finance', () => {
    expect(homeForRole('support')).toBe('/clients');
    expect(canSeeNavPath('support', '/')).toBe(false);
    expect(canAccessPath('support', '/')).toBe(false);
    expect(canAccessPath('support', '/finance')).toBe(false);
    expect(canAccessPath('support', '/payments')).toBe(false);
    expect(canAccessPath('support', '/users')).toBe(false);
    expect(canAccessPath('support', '/audit-logs')).toBe(false);
    expect(canAccessPath('support', '/bookings/abc')).toBe(true);
    expect(canAccessPath('support', '/clients')).toBe(true);
  });

  it('keeps Splizer on finance collection only', () => {
    expect(homeForRole('splizer')).toBe('/splizer');
    expect(canAccessPath('splizer', '/clients')).toBe(false);
    expect(canAccessPath('splizer', '/splizer')).toBe(true);
    expect(canAccessPath('splizer', '/notifications')).toBe(true);
  });

  it('blocks Driver from other bookings and dashboard', () => {
    expect(homeForRole('driver')).toBe('/drivers');
    expect(canAccessPath('driver', '/')).toBe(false);
    expect(canAccessPath('driver', '/bookings')).toBe(false);
    expect(canAccessPath('driver', '/driver/me')).toBe(true);
  });

  it('lets admin open every staff path', () => {
    expect(canAccessPath('admin', '/users')).toBe(true);
    expect(canAccessPath('admin', '/audit-logs')).toBe(true);
    expect(canAccessPath('admin', '/finance')).toBe(true);
  });
});

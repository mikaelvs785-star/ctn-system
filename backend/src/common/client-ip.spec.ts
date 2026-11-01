import { describe, expect, it } from 'vitest';
import { getRateLimitIp } from './client-ip.js';

const request = (
  headers: Record<string, string | string[] | undefined> = {},
  remoteAddress = '10.0.0.8',
) => ({ headers, socket: { remoteAddress } });

describe('getRateLimitIp', () => {
  it('uses a valid Cloudflare visitor IP', () => {
    expect(
      getRateLimitIp(request({ 'cf-connecting-ip': '203.0.113.10' })),
    ).toBe('203.0.113.10');
  });

  it('does not trust a forged X-Forwarded-For header', () => {
    expect(
      getRateLimitIp(
        request({ 'x-forwarded-for': '198.51.100.77' }),
      ),
    ).toBe('10.0.0.8');
  });

  it('rejects malformed or combined Cloudflare header values', () => {
    expect(
      getRateLimitIp(
        request({ 'cf-connecting-ip': '198.51.100.77, 203.0.113.10' }),
      ),
    ).toBe('10.0.0.8');
    expect(
      getRateLimitIp(request({ 'cf-connecting-ip': ['203.0.113.10'] })),
    ).toBe('10.0.0.8');
  });

  it('supports IPv6 client addresses', () => {
    expect(
      getRateLimitIp(request({ 'cf-connecting-ip': '2001:db8::1' })),
    ).toBe('2001:db8::1');
  });

  it('falls back to the TCP peer when the trusted header is absent', () => {
    expect(getRateLimitIp(request())).toBe('10.0.0.8');
  });

  it('returns unknown when neither source contains a valid IP', () => {
    expect(
      getRateLimitIp(request({ 'cf-connecting-ip': 'not-an-ip' }, 'invalid')),
    ).toBe('unknown');
  });
});

import { isIP } from 'node:net';

type ClientIpRequest = {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
};

/**
 * Render routes public traffic through Cloudflare. Cloudflare overwrites
 * CF-Connecting-IP with the visitor address before forwarding to the origin.
 *
 * Do not use X-Forwarded-For here: Render appends to that header rather than
 * guaranteeing that client-supplied values are removed.
 */
export function getRateLimitIp(req: ClientIpRequest): string {
  const cloudflareIp = req.headers['cf-connecting-ip'];

  if (typeof cloudflareIp === 'string') {
    const candidate = cloudflareIp.trim();
    if (candidate && isIP(candidate)) return candidate;
  }

  // Fail closed to the actual TCP peer. This may group traffic by proxy when
  // Cloudflare's header is absent, but never trusts a client-controlled header.
  const peerIp = req.socket.remoteAddress?.trim();
  return peerIp && isIP(peerIp) ? peerIp : 'unknown';
}

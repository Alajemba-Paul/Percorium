/**
 * Content Security Policy (CSP) & Defense-in-Depth Security Middleware
 *
 * Runs as Nitro middleware on Vercel / serverless runtime.
 * Prevents Cross-Site Scripting (XSS), clickjacking, and unauthorized
 * script execution by enforcing strict origin allowlists for:
 *   - 0x Aggregator API (api.0x.org, gas.api.0x.org, *.0x.org)
 *   - DexScreener (dexscreener.com, api.dexscreener.com, *.dexscreener.com)
 *   - Official Base RPC (mainnet.base.org, *.base.org, wss://mainnet.base.org)
 *   - Trusted UI font assets & preview sandbox embedders
 */
import { SECURITY_HEADERS } from "../../src/lib/percorium/csp";

interface NitroEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default async function cspMiddleware(
  _event: NitroEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();

  if (result instanceof Response) {
    const headers = new Headers(result.headers);
    for (const [key, val] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, val);
    }
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  }

  return result;
}

/**
 * Content Security Policy (CSP) & Defense-in-Depth Specification
 *
 * Defines the strict origin allowlists and directives enforced by
 * Nitro/Vercel middleware and HTTP response headers.
 */

export const PERCORIUM_CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://grok.com",
    "https://dexscreener.com",
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ],
  "font-src": [
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
  ],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://dexscreener.com",
    "https://*.dexscreener.com",
    "https://dd.dexscreener.com",
    "https://basescan.org",
    "https://og.grok.me",
  ],
  "connect-src": [
    "'self'",
    // 0x Protocol APIs
    "https://api.0x.org",
    "https://gas.api.0x.org",
    "https://*.0x.org",
    // DexScreener APIs
    "https://dexscreener.com",
    "https://api.dexscreener.com",
    "https://*.dexscreener.com",
    // Official Base Mainnet RPC and Fallbacks
    "https://mainnet.base.org",
    "https://*.base.org",
    "wss://mainnet.base.org",
    "wss://*.base.org",
    "https://base-rpc.publicnode.com",
    "https://developer-access-mainnet.base.org",
    "https://base.drpc.org",
    // Lending protocols
    "https://api.morpho.org",
    // Coinbase Wallet SDK Relays
    "https://*.coinbase.com",
    "wss://*.coinbase.com",
  ],
  "frame-src": [
    "'self'",
    "https://dexscreener.com",
    "https://*.dexscreener.com",
    "https://www.geckoterminal.com",
  ],
  "frame-ancestors": [
    "'self'",
    "https://ai.studio",
    "https://*.google.com",
    "https://*.run.app",
    "https://*.grok.me",
    "https://*.grok-sandbox.com",
  ],
  "media-src": ["'self'", "data:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

export function buildCspHeader(
  directives: Record<string, string[]> = PERCORIUM_CSP_DIRECTIVES,
): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export const CSP_HEADER_VALUE = buildCspHeader();

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP_HEADER_VALUE,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

import { getAddress, isAddress } from "viem";
import {
  AERO_ROUTER,
  AERO_SLIPSTREAM_NFPM,
  AERO_SLIPSTREAM_ROUTER,
  AERO_UNIVERSAL_ROUTER,
  ALLOWED_TRADE_TOKENS,
  PERMIT2,
  RESTRICTED_COUNTRIES,
  STOCK_BY_ADDRESS,
  type StockMeta,
  USDC,
  ZERO_EX_ALLOWANCE_HOLDER,
} from "./constants";

import type { FeedStatus, SequencerState } from "./types";

/**
 * TRUSTED SPENDERS AND EXECUTION TARGETS ON BASE (8453)
 * Calldata from aggregators/DEXes MUST target one of these verified contracts.
 * Any other spender or destination address is rejected as an unauthorized target.
 */
export const TRUSTED_ROUTERS_AND_SPENDERS = new Set<string>([
  getAddress(ZERO_EX_ALLOWANCE_HOLDER).toLowerCase(),
  getAddress(PERMIT2).toLowerCase(),
  getAddress(AERO_SLIPSTREAM_ROUTER).toLowerCase(),
  getAddress(AERO_SLIPSTREAM_NFPM).toLowerCase(),
  getAddress(AERO_UNIVERSAL_ROUTER).toLowerCase(),
  getAddress(AERO_ROUTER).toLowerCase(),
]);

/**
 * Validates that an address is strictly the official USDC contract on Base.
 * Rejects all lookalikes and bridged copies.
 */
export function assertUsdc(token: string): `0x${string}` {
  if (!isAddress(token)) {
    throw new Error(`Security violation: Invalid address format for USDC: ${token}`);
  }
  const checksummed = getAddress(token);
  if (checksummed.toLowerCase() !== USDC.toLowerCase()) {
    throw new Error(`Security violation: Address ${token} is not official Base USDC (${USDC})`);
  }
  return checksummed;
}

/**
 * Validates that an address is strictly an official Coinbase B20 token.
 * Validates against CB_STOCKS / registry 0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD.
 */
export function assertOfficialB20(token: string): StockMeta {
  if (!isAddress(token)) {
    throw new Error(`Security violation: Invalid address format: ${token}`);
  }
  const checksummed = getAddress(token);
  const meta = STOCK_BY_ADDRESS[checksummed.toLowerCase()];
  if (!meta) {
    throw new Error(
      `Security violation: Token ${checksummed} is not an official Coinbase B20 stock on Base. Unofficial lookalikes are rejected.`,
    );
  }
  return meta;
}

/**
 * Validates that a token is allowed in trading (either USDC or official B20 stock).
 */
export function assertAllowedTradeToken(token: string): `0x${string}` {
  if (!isAddress(token)) {
    throw new Error(`Security violation: Invalid address: ${token}`);
  }
  const checksummed = getAddress(token);
  if (!ALLOWED_TRADE_TOKENS.has(checksummed.toLowerCase())) {
    throw new Error(
      `Security violation: Token ${checksummed} is not allowlisted for trading. Only USDC and official Coinbase B20 tokens are permitted.`,
    );
  }
  return checksummed;
}

/**
 * Validates a trading pair:
 * - At least one leg MUST be USDC, or it must be a stock-to-stock swap between two official B20s.
 * - Every stock token MUST be in the official Coinbase B20 registry (0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD).
 * - USDC leg MUST be the official Base USDC contract.
 */
export function assertAllowedTradePair(
  sellToken: string,
  buyToken: string,
): { sellToken: `0x${string}`; buyToken: `0x${string}` } {
  const sell = assertAllowedTradeToken(sellToken);
  const buy = assertAllowedTradeToken(buyToken);
  if (sell.toLowerCase() === buy.toLowerCase()) {
    throw new Error("Security violation: Cannot swap token for itself.");
  }
  const usdcLc = USDC.toLowerCase();
  const sellIsUsdc = sell.toLowerCase() === usdcLc;
  const buyIsUsdc = buy.toLowerCase() === usdcLc;

  if (sellIsUsdc && buyIsUsdc) {
    throw new Error("Security violation: Cannot swap USDC for USDC.");
  }

  if (sellIsUsdc) {
    // Buy token must be verified in the official Coinbase B20 registry
    assertOfficialB20(buy);
  } else if (buyIsUsdc) {
    // Sell token must be verified in the official Coinbase B20 registry
    assertOfficialB20(sell);
  } else {
    // Stock-to-stock: both tokens must be verified in the official Coinbase B20 registry
    assertOfficialB20(sell);
    assertOfficialB20(buy);
  }

  return { sellToken: sell, buyToken: buy };
}

/**
 * Validates a taker address to prevent quote poisoning.
 * - Rejects non-checksummable / malformed addresses.
 * - Rejects zero address.
 * - Rejects router/spender/token contract addresses from being set as the taker.
 */
export function assertValidTaker(taker?: string): `0x${string}` | undefined {
  if (!taker || taker.trim() === "") return undefined;
  if (!isAddress(taker)) {
    throw new Error(`Security violation: Malformed taker address: ${taker}`);
  }
  const checksummed = getAddress(taker);
  const lc = checksummed.toLowerCase();
  if (/^0x0{40}$/i.test(lc)) {
    throw new Error("Security violation: Taker cannot be the zero address.");
  }
  if (TRUSTED_ROUTERS_AND_SPENDERS.has(lc) || ALLOWED_TRADE_TOKENS.has(lc)) {
    throw new Error(
      "Security violation: Quote poisoning detected. Taker cannot be a router, spender, or token contract address.",
    );
  }
  return checksummed;
}

/**
 * Validates that an execution target (`to`) and allowance target (`spender`)
 * strictly belong to the trusted set of Base routers and allowance holders.
 * Rejects arbitrary user or unknown contract addresses.
 */
export function assertZeroExTarget(
  to?: string,
  allowanceTarget?: string,
): void {
  if (to) {
    if (!isAddress(to)) {
      throw new Error(`Security violation: Malformed execution target address: ${to}`);
    }
    const checksummedTo = getAddress(to).toLowerCase();
    if (!TRUSTED_ROUTERS_AND_SPENDERS.has(checksummedTo)) {
      throw new Error(
        `Security violation: Untrusted execution target ${to}. Must be 0x AllowanceHolder, Permit2, or Aerodrome.`,
      );
    }
  }

  if (allowanceTarget) {
    if (!isAddress(allowanceTarget)) {
      throw new Error(
        `Security violation: Malformed allowance spender address: ${allowanceTarget}`,
      );
    }
    const checksummedSpender = getAddress(allowanceTarget).toLowerCase();
    if (!TRUSTED_ROUTERS_AND_SPENDERS.has(checksummedSpender)) {
      throw new Error(
        `Security violation: Untrusted allowance spender ${allowanceTarget}. Refusing to approve untrusted address.`,
      );
    }
  }
}

/**
 * Evaluates geographic headers from Edge infrastructure (Vercel, Cloudflare, CloudFront).
 * Fails closed if US or any restricted jurisdiction is detected.
 * Ignores client-set spoofable headers like `x-forwarded-for` or `x-country`.
 */
export function assertNotUs(headers: {
  vercelCountry?: string | null;
  cfCountry?: string | null;
  cloudFrontCountry?: string | null;
}): void {
  const rawCountry =
    headers.vercelCountry ||
    headers.cfCountry ||
    headers.cloudFrontCountry;

  if (rawCountry) {
    const country = rawCountry.trim().toUpperCase().slice(0, 2);
    if (RESTRICTED_COUNTRIES.has(country)) {
      throw new Error(
        `Access denied: Trading Coinbase Tokenized Stocks is strictly prohibited for US persons and restricted jurisdictions (${country}).`,
      );
    }
  }
}

/**
 * Validates Chainlink feed freshness and Base sequencer uptime.
 * Fails closed if:
 * - Sequencer is down
 * - Sequencer is in grace period
 * - Feed status is paused or stale
 */
export function assertFreshOracle(
  feedStatus?: FeedStatus,
  sequencer?: SequencerState,
): void {
  if (sequencer) {
    if (!sequencer.up) {
      throw new Error("Fail-closed: Base L2 sequencer is currently offline.");
    }
    if (sequencer.grace) {
      throw new Error("Fail-closed: Base sequencer recently restarted; in safety grace period.");
    }
  }
  if (feedStatus === "paused") {
    throw new Error("Fail-closed: Chainlink equity oracle feed is paused.");
  }
  if (feedStatus === "stale") {
    throw new Error("Fail-closed: Chainlink equity oracle feed heartbeat missed on weekday.");
  }
}

/**
 * Bounds slippage tolerance between 5 bps (0.05%) and 300 bps (3.0%).
 * Rejects dangerous or excessive slippage requests.
 */
export function assertSlippageBounds(slippageBps?: number): number {
  const bps = slippageBps ?? 100; // default 1% (100 bps)
  if (!Number.isFinite(bps) || bps < 5 || bps > 300) {
    throw new Error(
      `Security violation: Slippage ${bps} bps is out of safe bounds (min 5 bps / 0.05%, max 300 bps / 3.0%).`,
    );
  }
  return bps;
}

/**
 * Sanitizes chat messages to prevent HTML / XSS injection and enforce size limits.
 */
export function sanitizeChatMessage(raw: string): string {
  if (typeof raw !== "string") return "";
  // Strip control characters and HTML tags
  const sanitized = raw
    .replace(/[<>]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim()
    .slice(0, 280);

  return sanitized;
}

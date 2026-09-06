import { createServerFn } from "@tanstack/react-start";
import {
  encodeFunctionData,
  getAddress,
  parseUnits,
} from "viem";
import {
  AERO_FACTORY,
  AERO_ROUTER,
  BASIS_REJECT_BPS,
  STOCK_BY_ADDRESS,
  USDC,
  ZERO_EX_ALLOWANCE_HOLDER,
} from "./constants";

import {
  AERO_FACTORY_ABI,
  AERO_PAIR_ABI,
  AERO_ROUTER_ABI,
  AGGREGATOR_V3_ABI,
} from "./abis";
import { hasOneInchKey, hasZeroExKey, oneInchApiKey, zeroExApiKey } from "./env";
import { assertServerGeoNotUs } from "./geo.server";
import { getPublicClient } from "./rpc";
import {
  assertAllowedTradePair,
  assertSlippageBounds,
  assertValidTaker,
  assertZeroExTarget,
} from "./security";
import type { QuoteRequest, QuoteResult } from "./types";

const ZERO_EX_VERSION = "v2";

function tokenDecimals(addr: string): number {

  return addr.toLowerCase() === USDC.toLowerCase() ? 6 : 18;
}

function asAddr(addr: string): `0x${string}` {
  return getAddress(addr);
}

function isRealTaker(taker?: string): taker is `0x${string}` {
  if (!taker) return false;
  try {
    return Boolean(assertValidTaker(taker));
  } catch {
    return false;
  }
}

async function oraclePx(token: string): Promise<number | null> {
  if (token.toLowerCase() === USDC.toLowerCase()) return 1;
  const meta = STOCK_BY_ADDRESS[token.toLowerCase()];
  if (!meta) return null;
  const client = getPublicClient();
  const round = await client.readContract({
    address: meta.feed,
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
  });
  return Number(round[1]) / 1e8;
}

type RouterAttempt = { quote: QuoteResult | null; note: string };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 240) };
  }
}

function errMsg(json: Record<string, unknown>, status: number): string {
  const msg =
    (typeof json.message === "string" && json.message) ||
    (typeof json.reason === "string" && json.reason) ||
    (typeof json.description === "string" && json.description) ||
    (typeof json.name === "string" && json.name) ||
    `HTTP ${status}`;
  return msg.slice(0, 220);
}

function from0xBody(
  json: Record<string, unknown>,
  req: QuoteRequest,
): QuoteResult | null {
  const buyAmount = typeof json.buyAmount === "string" ? json.buyAmount : null;
  if (!buyAmount || buyAmount === "0") return null;
  if (json.liquidityAvailable === false) return null;
  const tx = json.transaction as
    | { to?: string; data?: string; value?: string; gas?: string | number }
    | undefined;
  const issues = json.issues as
    | { allowance?: { spender?: string } | null }
    | undefined;
  const to = (tx?.to ?? undefined) as `0x${string}` | undefined;
  const data = (tx?.data ?? undefined) as `0x${string}` | undefined;
  const allowanceTarget =
    (issues?.allowance?.spender as `0x${string}` | undefined) ??
    (data ? ZERO_EX_ALLOWANCE_HOLDER : undefined);

  // Security: Verify 0x target and allowance spender against trusted contracts
  if (to || allowanceTarget) {
    try {
      assertZeroExTarget(to, allowanceTarget);
    } catch {
      return null;
    }
  }

  return {
    ok: true,
    source: "0x",
    sellToken: req.sellToken,
    buyToken: req.buyToken,
    sellAmount: typeof json.sellAmount === "string" ? json.sellAmount : req.sellAmount,
    buyAmount,
    minBuyAmount: typeof json.minBuyAmount === "string" ? json.minBuyAmount : undefined,
    price: "0",
    estimatedGas: tx?.gas != null ? String(tx.gas) : undefined,
    to,
    data,
    value: tx?.value ?? "0",
    allowanceTarget,
    executable: Boolean(to && data),
  };
}

async function quote0x(
  req: QuoteRequest,
  slippageBps: number,
): Promise<RouterAttempt> {
  const key = zeroExApiKey();
  if (!key) return { quote: null, note: "0x key missing in runtime env" };

  const taker = isRealTaker(req.taker) ? req.taker : undefined;
  const path = taker
    ? "/swap/allowance-holder/quote"
    : "/swap/allowance-holder/price";
  const url = new URL(`https://api.0x.org${path}`);
  url.searchParams.set("chainId", "8453");
  url.searchParams.set("sellToken", asAddr(req.sellToken));
  url.searchParams.set("buyToken", asAddr(req.buyToken));
  url.searchParams.set("sellAmount", req.sellAmount);
  url.searchParams.set("slippageBps", String(slippageBps));
  if (taker) url.searchParams.set("taker", asAddr(taker));

  try {
    const res = await fetch(url, {
      headers: {
        "0x-api-key": key,
        "0x-version": ZERO_EX_VERSION,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const json = await readJson(res);
    if (!res.ok) {
      return { quote: null, note: `0x ${res.status}: ${errMsg(json, res.status)}` };
    }
    const quote = from0xBody(json, req);
    if (!quote) {
      return { quote: null, note: "0x: no liquidity or untrusted route for this pair" };
    }
    if (!taker) {
      quote.issues = ["0x price (connect wallet for calldata)"];
    }
    return { quote, note: taker ? "0x quote" : "0x price" };
  } catch (err) {
    return {
      quote: null,
      note: `0x network: ${err instanceof Error ? err.message : "fetch failed"}`,
    };
  }
}

async function quote1inch(
  req: QuoteRequest,
  slippageBps: number,
): Promise<RouterAttempt> {
  const key = oneInchApiKey();
  if (!key) return { quote: null, note: "1inch key missing in runtime env" };

  const taker = isRealTaker(req.taker) ? req.taker : undefined;
  const path = taker ? "swap" : "quote";
  const url = new URL(`https://api.1inch.com/swap/v6.1/8453/${path}`);
  url.searchParams.set("src", asAddr(req.sellToken));
  url.searchParams.set("dst", asAddr(req.buyToken));
  url.searchParams.set("amount", req.sellAmount);
  url.searchParams.set("slippage", (slippageBps / 100).toFixed(2));
  if (taker) {
    url.searchParams.set("from", asAddr(taker));
    url.searchParams.set("disableEstimate", "true");
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const json = await readJson(res);
    if (!res.ok) {
      return {
        quote: null,
        note: `1inch ${res.status}: ${errMsg(json, res.status)}`,
      };
    }
    const buyAmount =
      (typeof json.dstAmount === "string" && json.dstAmount) ||
      (typeof json.toAmount === "string" && json.toAmount) ||
      null;
    if (!buyAmount) return { quote: null, note: "1inch: empty dstAmount" };
    const tx = json.tx as
      | { to?: string; data?: string; value?: string; gas?: number }
      | undefined;

    // Security: Validate 1inch router execution target
    if (tx?.to) {
      try {
        assertZeroExTarget(tx.to, tx.to);
      } catch {
        return { quote: null, note: "1inch: untrusted execution target" };
      }
    }

    return {
      quote: {
        ok: true,
        source: "1inch",
        sellToken: req.sellToken,
        buyToken: req.buyToken,
        sellAmount: req.sellAmount,
        buyAmount,
        price: "0",
        estimatedGas: tx?.gas ? String(tx.gas) : undefined,
        to: tx?.to as `0x${string}` | undefined,
        data: tx?.data as `0x${string}` | undefined,
        value: tx?.value ?? "0",
        allowanceTarget: (tx?.to ?? undefined) as `0x${string}` | undefined,
        executable: Boolean(tx?.to && tx?.data),
      },
      note: taker ? "1inch swap" : "1inch quote",
    };
  } catch (err) {
    return {
      quote: null,
      note: `1inch network: ${err instanceof Error ? err.message : "fetch failed"}`,
    };
  }
}

type AeroRoute = {
  from: `0x${string}`;
  to: `0x${string}`;
  stable: boolean;
  factory: `0x${string}`;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const MIN_USDC_RESERVE = 200n * 1_000_000n; // 200 USDC

async function aeroUsdcReserve(token: string): Promise<bigint | null> {
  const client = getPublicClient();
  const pool = await client.readContract({
    address: AERO_FACTORY,
    abi: AERO_FACTORY_ABI,
    functionName: "getPool",
    args: [asAddr(token), asAddr(USDC), false],
  });
  if (!pool || pool.toLowerCase() === ZERO_ADDRESS) return null;
  const [token0, reserves] = await Promise.all([
    client.readContract({ address: pool, abi: AERO_PAIR_ABI, functionName: "token0" }),
    client.readContract({ address: pool, abi: AERO_PAIR_ABI, functionName: "getReserves" }),
  ]);
  const usdcIs0 = token0.toLowerCase() === USDC.toLowerCase();
  return usdcIs0 ? reserves[0] : reserves[1];
}

function hop(from: string, to: string): AeroRoute {
  return {
    from: asAddr(from),
    to: asAddr(to),
    stable: false,
    factory: AERO_FACTORY,
  };
}

async function quoteAerodrome(
  req: QuoteRequest,
  slippageBps: number,
): Promise<RouterAttempt> {
  const sell = req.sellToken.toLowerCase();
  const buy = req.buyToken.toLowerCase();
  const usdc = USDC.toLowerCase();

  const routes: AeroRoute[] = [];
  try {
    if (sell === usdc || buy === usdc) {
      const stock = sell === usdc ? req.buyToken : req.sellToken;
      const reserve = await aeroUsdcReserve(stock);
      if (reserve == null) {
        return { quote: null, note: "Aerodrome V2: no USDC pool" };
      }
      if (reserve < MIN_USDC_RESERVE) {
        return {
          quote: null,
          note: `Aerodrome V2 pool too thin (${reserve.toString()} USDC raw)`,
        };
      }
      routes.push(hop(req.sellToken, req.buyToken));
    } else {
      const [a, b] = await Promise.all([
        aeroUsdcReserve(req.sellToken),
        aeroUsdcReserve(req.buyToken),
      ]);
      if (a == null || b == null) {
        return { quote: null, note: "Aerodrome V2: missing USDC pool for a leg" };
      }
      if (a < MIN_USDC_RESERVE || b < MIN_USDC_RESERVE) {
        return { quote: null, note: "Aerodrome V2: a hop is too thin" };
      }
      routes.push(hop(req.sellToken, USDC), hop(USDC, req.buyToken));
    }
  } catch (err) {
    return {
      quote: null,
      note: `Aerodrome pool lookup: ${err instanceof Error ? err.message : "revert"}`,
    };
  }

  const client = getPublicClient();
  let amounts: readonly bigint[];
  try {
    amounts = await client.readContract({
      address: AERO_ROUTER,
      abi: AERO_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [BigInt(req.sellAmount), routes],
    });
  } catch (err) {
    return {
      quote: null,
      note: `Aerodrome getAmountsOut: ${err instanceof Error ? err.message : "revert"}`,
    };
  }
  const buyRaw = amounts[amounts.length - 1];
  if (!buyRaw || buyRaw === 0n) {
    return { quote: null, note: "Aerodrome: zero output" };
  }
  const minOut = (buyRaw * BigInt(10_000 - slippageBps)) / 10_000n;
  const taker = isRealTaker(req.taker) ? asAddr(req.taker) : undefined;
  let to: `0x${string}` | undefined;
  let data: `0x${string}` | undefined;
  if (taker) {
    to = AERO_ROUTER;
    data = encodeFunctionData({
      abi: AERO_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [
        BigInt(req.sellAmount),
        minOut,
        routes,
        taker,
        BigInt(Math.floor(Date.now() / 1000) + 20 * 60),
      ],
    });
  }

  // Security: verify target against trusted routers
  if (to) {
    assertZeroExTarget(to, AERO_ROUTER);
  }

  return {
    quote: {
      ok: true,
      source: "aerodrome",
      sellToken: req.sellToken,
      buyToken: req.buyToken,
      sellAmount: req.sellAmount,
      buyAmount: buyRaw.toString(),
      minBuyAmount: minOut.toString(),
      price: "0",
      to,
      data,
      value: "0",
      allowanceTarget: data ? AERO_ROUTER : undefined,
      executable: Boolean(to && data),
      issues: data
        ? ["Aerodrome official USDC pool"]
        : ["Aerodrome price (connect wallet for calldata)"],
    },
    note: "Aerodrome official USDC pool",
  };
}

export const fetchSwapQuote = createServerFn({ method: "POST" })
  .validator((d: QuoteRequest) => d)
  .handler(async ({ data }): Promise<QuoteResult> => {
    // 1. Hard server-side Geo-blocking: fail closed if US or restricted jurisdiction
    try {
      assertServerGeoNotUs();
    } catch {
      return {
        ok: false,
        source: "oracle",
        sellToken: data.sellToken,
        buyToken: data.buyToken,
        sellAmount: data.sellAmount,
        buyAmount: "0",
        price: "0",
        error: "Access denied: Trading is restricted in your jurisdiction (US/sanctioned).",
        issues: ["geo-restricted"],
      };
    }

    // 2. Strict token pair validation: official Coinbase B20 and USDC only
    let pair: { sellToken: `0x${string}`; buyToken: `0x${string}` };
    try {
      pair = assertAllowedTradePair(data.sellToken, data.buyToken);
    } catch (err) {
      return {
        ok: false,
        source: "oracle",
        sellToken: data.sellToken,
        buyToken: data.buyToken,
        sellAmount: data.sellAmount,
        buyAmount: "0",
        price: "0",
        error: err instanceof Error ? err.message : "Token is not allowlisted.",
        issues: ["allowlist-rejected"],
      };
    }

    // 3. Slippage validation
    let slippageBps = 100;
    try {
      slippageBps = assertSlippageBounds(data.slippageBps);
    } catch (err) {
      return {
        ok: false,
        source: "oracle",
        sellToken: pair.sellToken,
        buyToken: pair.buyToken,
        sellAmount: data.sellAmount,
        buyAmount: "0",
        price: "0",
        error: err instanceof Error ? err.message : "Invalid slippage bounds.",
        issues: ["slippage-bounds"],
      };
    }

    // 4. Validate taker address if provided (prevent quote poisoning)
    let validatedTaker: `0x${string}` | undefined;
    if (data.taker && data.taker.trim() !== "") {
      try {
        validatedTaker = assertValidTaker(data.taker);
      } catch (err) {
        return {
          ok: false,
          source: "oracle",
          sellToken: pair.sellToken,
          buyToken: pair.buyToken,
          sellAmount: data.sellAmount,
          buyAmount: "0",
          price: "0",
          error: err instanceof Error ? err.message : "Invalid taker wallet address.",
          issues: ["invalid-taker"],
        };
      }
    }

    const issues: string[] = [];
    issues.push(
      hasZeroExKey() ? "0x key: loaded" : "0x key: not in runtime env",
    );
    issues.push(
      hasOneInchKey() ? "1inch key: loaded" : "1inch key: not in runtime env",
    );

    const safeReq: QuoteRequest = {
      ...data,
      sellToken: pair.sellToken,
      buyToken: pair.buyToken,
      taker: validatedTaker,
      slippageBps,
    };

    const attempts: RouterAttempt[] = [];
    attempts.push(await quote0x(safeReq, slippageBps));
    if (!attempts.some((a) => a.quote)) attempts.push(await quote1inch(safeReq, slippageBps));
    if (!attempts.some((a) => a.quote)) attempts.push(await quoteAerodrome(safeReq, slippageBps));

    for (const attempt of attempts) {
      if (attempt.note) issues.push(attempt.note);
    }

    const live = attempts.find((a) => a.quote)?.quote ?? null;

    const sellDec = tokenDecimals(pair.sellToken);
    const buyDec = tokenDecimals(pair.buyToken);
    const sellUnits = Number(data.sellAmount) / 10 ** sellDec;
    const [sellPx, buyPx] = await Promise.all([
      oraclePx(pair.sellToken),
      oraclePx(pair.buyToken),
    ]);

    if (!sellPx || !buyPx) {
      return {
        ok: false,
        source: "oracle",
        sellToken: pair.sellToken,
        buyToken: pair.buyToken,
        sellAmount: data.sellAmount,
        buyAmount: "0",
        price: "0",
        error: "Missing Chainlink price for pair.",
        issues,
      };
    }

    const oracleBuy = (sellUnits * sellPx) / buyPx;
    const oracleBuyRaw = parseUnits(oracleBuy.toFixed(buyDec), buyDec).toString();

    if (live) {
      const ammBuy = Number(live.buyAmount) / 10 ** buyDec;
      const bps = Math.round(((ammBuy - oracleBuy) / oracleBuy) * 10_000);
      const tagged = {
        ...live,
        price: sellUnits > 0 ? (ammBuy / sellUnits).toString() : "0",
        issues: [...issues, ...(live.issues ?? []), `basis ${bps} bps vs Chainlink`],
      };
      if (Math.abs(bps) > BASIS_REJECT_BPS) {
        return {
          ...tagged,
          ok: false,
          executable: false,
          error: "AMM quote deviates too far from the Chainlink risk price.",
        };
      }
      return tagged;
    }

    const keyless = !hasZeroExKey() && !hasOneInchKey();
    issues.push(
      keyless
        ? "No 0x/1inch key in the server runtime — showing Chainlink-indicative size."
        : "Routers returned no route — showing Chainlink-indicative size. Execution is disabled.",
    );
    return {
      ok: false,
      source: "oracle",
      sellToken: pair.sellToken,
      buyToken: pair.buyToken,
      sellAmount: data.sellAmount,
      buyAmount: oracleBuyRaw,
      price: sellUnits > 0 ? (oracleBuy / sellUnits).toString() : "0",
      executable: false,
      issues,
      error: keyless
        ? "Live router quote unavailable. Set ZERO_EX_API_KEY on the server runtime (not only at build) and redeploy."
        : "0x/1inch/Aerodrome had no executable route for this pair.",
    };
  });


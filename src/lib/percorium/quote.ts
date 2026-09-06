import { createServerFn } from "@tanstack/react-start";
import {
  encodeFunctionData,
  getAddress,
} from "viem";
import {
  AERO_SLIPSTREAM_ROUTER,
  BASIS_REJECT_BPS,
  STOCK_BY_ADDRESS,
  USDC,
  ZERO_EX_ALLOWANCE_HOLDER,
} from "./constants";
import {
  AERO_SLIPSTREAM_POOL_ABI,
  AERO_SLIPSTREAM_ROUTER_ABI,
  AGGREGATOR_V3_ABI,
} from "./abis";
import { hasZeroExKey, zeroExApiKey } from "./env";
import { assertServerGeoNotUs } from "./geo.server";
import { getPublicClient } from "./rpc";
import {
  assertAllowedTradePair,
  assertSlippageBounds,
  assertValidTaker,
  assertZeroExTarget,
} from "./security";
import type { QuoteRequest, QuoteResult } from "./types";
import { fetchAerodromeSlipstreamUsdcPair } from "../dexscreener";

const ZERO_EX_VERSION = "v2";

function tokenDecimals(addr: string): number {
  return addr.toLowerCase() === USDC.toLowerCase() ? 6 : 8;
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

    // 0x 422 BUY_TOKEN_NOT_AUTHORIZED_FOR_TRADE / SELL_TOKEN_NOT_AUTHORIZED_FOR_TRADE: skip silently
    if (res.status === 422) {
      return { quote: null, note: "" };
    }

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

/**
 * Builds an Aerodrome Slipstream (concentrated liquidity) swap.
 * Discovers the pool from DexScreener for that exact token.
 * Reads pool state onchain (token0, token1, tickSpacing, slot0) and encodes exactInputSingle.
 */
async function quoteAerodromeSlipstream(
  req: QuoteRequest,
  slippageBps: number,
): Promise<RouterAttempt> {
  const sellLc = req.sellToken.toLowerCase();
  const buyLc = req.buyToken.toLowerCase();
  const usdcLc = USDC.toLowerCase();

  const isSellUsdc = sellLc === usdcLc;
  const isBuyUsdc = buyLc === usdcLc;

  // Single-hop trade: USDC <-> B20
  if (isSellUsdc || isBuyUsdc) {
    const stockAddr = isSellUsdc ? req.buyToken : req.sellToken;
    const pair = await fetchAerodromeSlipstreamUsdcPair(stockAddr);
    if (!pair || !pair.pairAddress) {
      return {
        quote: null,
        note: "No official USDC pool for this stock yet. You cannot buy or sell here.",
      };
    }

    try {
      const client = getPublicClient();
      const poolAddr = asAddr(pair.pairAddress);

      const [token0, _token1, tickSpacing, slot0] = await Promise.all([
        client.readContract({
          address: poolAddr,
          abi: AERO_SLIPSTREAM_POOL_ABI,
          functionName: "token0",
        }),
        client.readContract({
          address: poolAddr,
          abi: AERO_SLIPSTREAM_POOL_ABI,
          functionName: "token1",
        }),
        client.readContract({
          address: poolAddr,
          abi: AERO_SLIPSTREAM_POOL_ABI,
          functionName: "tickSpacing",
        }),
        client.readContract({
          address: poolAddr,
          abi: AERO_SLIPSTREAM_POOL_ABI,
          functionName: "slot0",
        }),
      ]);

      const sqrtPriceX96 = BigInt(slot0[0]);
      if (sqrtPriceX96 === 0n) {
        return { quote: null, note: "Aerodrome Slipstream: uninitialized pool" };
      }

      const sellRaw = BigInt(req.sellAmount);
      let buyRaw: bigint;

      const token0IsUsdc = token0.toLowerCase() === usdcLc;

      if (isSellUsdc) {
        // Selling USDC to buy B20
        if (token0IsUsdc) {
          // token0 = USDC, token1 = B20
          // sqrtPriceX96 = sqrt(B20_raw / USDC_raw)
          // buyRaw = sellRaw * (sqrtPriceX96^2) / 2^192
          buyRaw = (sellRaw * sqrtPriceX96 * sqrtPriceX96) / (2n ** 192n);
        } else {
          // token0 = B20, token1 = USDC
          // sqrtPriceX96 = sqrt(USDC_raw / B20_raw)
          // buyRaw = sellRaw * 2^192 / (sqrtPriceX96^2)
          buyRaw = (sellRaw * (2n ** 192n)) / (sqrtPriceX96 * sqrtPriceX96);
        }
      } else {
        // Selling B20 to buy USDC
        if (token0IsUsdc) {
          // token0 = USDC, token1 = B20
          // sqrtPriceX96 = sqrt(B20_raw / USDC_raw)
          // buyRaw = sellRaw * 2^192 / (sqrtPriceX96^2)
          buyRaw = (sellRaw * (2n ** 192n)) / (sqrtPriceX96 * sqrtPriceX96);
        } else {
          // token0 = B20, token1 = USDC
          // sqrtPriceX96 = sqrt(USDC_raw / B20_raw)
          // buyRaw = sellRaw * (sqrtPriceX96^2) / 2^192
          buyRaw = (sellRaw * sqrtPriceX96 * sqrtPriceX96) / (2n ** 192n);
        }
      }

      if (buyRaw <= 0n) {
        return { quote: null, note: "Aerodrome Slipstream: zero output" };
      }

      const minBuyAmount = (buyRaw * BigInt(10_000 - slippageBps)) / 10_000n;
      const taker = isRealTaker(req.taker) ? asAddr(req.taker) : undefined;

      let to: `0x${string}` | undefined;
      let data: `0x${string}` | undefined;

      if (taker) {
        to = AERO_SLIPSTREAM_ROUTER;
        data = encodeFunctionData({
          abi: AERO_SLIPSTREAM_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: asAddr(req.sellToken),
              tokenOut: asAddr(req.buyToken),
              tickSpacing,
              recipient: taker,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
              amountIn: sellRaw,
              amountOutMinimum: minBuyAmount,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });

        assertZeroExTarget(to, AERO_SLIPSTREAM_ROUTER);
      }

      return {
        quote: {
          ok: true,
          source: "aerodrome",
          sellToken: req.sellToken,
          buyToken: req.buyToken,
          sellAmount: req.sellAmount,
          buyAmount: buyRaw.toString(),
          minBuyAmount: minBuyAmount.toString(),
          price: "0",
          to,
          data,
          value: "0",
          allowanceTarget: data ? AERO_SLIPSTREAM_ROUTER : undefined,
          executable: Boolean(to && data),
          issues: data
            ? ["Aerodrome Slipstream official pool"]
            : ["Aerodrome Slipstream price (connect wallet for calldata)"],
        },
        note: "Aerodrome Slipstream official pool",
      };
    } catch (err) {
      return {
        quote: null,
        note: `Aerodrome Slipstream error: ${err instanceof Error ? err.message : "query failed"}`,
      };
    }
  }

  // Stock-to-stock swap: Stock A -> USDC -> Stock B
  try {
    const [pairA, pairB] = await Promise.all([
      fetchAerodromeSlipstreamUsdcPair(req.sellToken),
      fetchAerodromeSlipstreamUsdcPair(req.buyToken),
    ]);

    if (!pairA?.pairAddress || !pairB?.pairAddress) {
      return {
        quote: null,
        note: "No official USDC pool for this stock yet. You cannot buy or sell here.",
      };
    }

    const client = getPublicClient();
    const [slot0A, token0A, slot0B, token0B] = await Promise.all([
      client.readContract({
        address: asAddr(pairA.pairAddress),
        abi: AERO_SLIPSTREAM_POOL_ABI,
        functionName: "slot0",
      }),
      client.readContract({
        address: asAddr(pairA.pairAddress),
        abi: AERO_SLIPSTREAM_POOL_ABI,
        functionName: "token0",
      }),
      client.readContract({
        address: asAddr(pairB.pairAddress),
        abi: AERO_SLIPSTREAM_POOL_ABI,
        functionName: "slot0",
      }),
      client.readContract({
        address: asAddr(pairB.pairAddress),
        abi: AERO_SLIPSTREAM_POOL_ABI,
        functionName: "token0",
      }),
    ]);

    const sqrtA = BigInt(slot0A[0]);
    const sqrtB = BigInt(slot0B[0]);
    if (sqrtA === 0n || sqrtB === 0n) {
      return { quote: null, note: "Aerodrome Slipstream: uninitialized pool" };
    }

    const sellRaw = BigInt(req.sellAmount);

    // Hop 1: Sell Stock A for USDC
    const token0AIsUsdc = token0A.toLowerCase() === usdcLc;
    const usdcIntermediate = token0AIsUsdc
      ? (sellRaw * (2n ** 192n)) / (sqrtA * sqrtA)
      : (sellRaw * sqrtA * sqrtA) / (2n ** 192n);

    if (usdcIntermediate <= 0n) {
      return { quote: null, note: "Aerodrome Slipstream: zero intermediate output" };
    }

    // Hop 2: Buy Stock B with USDC
    const token0BIsUsdc = token0B.toLowerCase() === usdcLc;
    const buyRaw = token0BIsUsdc
      ? (usdcIntermediate * sqrtB * sqrtB) / (2n ** 192n)
      : (usdcIntermediate * (2n ** 192n)) / (sqrtB * sqrtB);

    if (buyRaw <= 0n) {
      return { quote: null, note: "Aerodrome Slipstream: zero final output" };
    }

    const minBuyAmount = (buyRaw * BigInt(10_000 - slippageBps)) / 10_000n;

    return {
      quote: {
        ok: true,
        source: "aerodrome",
        sellToken: req.sellToken,
        buyToken: req.buyToken,
        sellAmount: req.sellAmount,
        buyAmount: buyRaw.toString(),
        minBuyAmount: minBuyAmount.toString(),
        price: "0",
        to: undefined,
        data: undefined,
        value: "0",
        allowanceTarget: undefined,
        executable: false,
        issues: ["Aerodrome Slipstream multi-hop indicative route"],
      },
      note: "Aerodrome Slipstream multi-hop",
    };
  } catch (err) {
    return {
      quote: null,
      note: `Aerodrome Slipstream error: ${err instanceof Error ? err.message : "query failed"}`,
    };
  }
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

    const safeReq: QuoteRequest = {
      ...data,
      sellToken: pair.sellToken,
      buyToken: pair.buyToken,
      taker: validatedTaker,
      slippageBps,
    };

    // New Router Order:
    // 1) Try 0x AllowanceHolder quote, chainId 8453, official addresses only.
    //    If HTTP 200 and calldata present -> use it.
    //    If 422 authorized-for-trade -> skip 0x silently.
    // 2) Else build an Aerodrome Slipstream swap (CL / "aerodrome-slipstream").
    // 3) If DexScreener finds no USDC pool -> disable execution with plain copy.
    const attempts: RouterAttempt[] = [];
    attempts.push(await quote0x(safeReq, slippageBps));
    if (!attempts.some((a) => a.quote)) {
      attempts.push(await quoteAerodromeSlipstream(safeReq, slippageBps));
    }

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

    if (live) {
      const ammBuy = Number(live.buyAmount) / 10 ** buyDec;
      const tagged = {
        ...live,
        price: sellUnits > 0 ? (ammBuy / sellUnits).toString() : "0",
      };

      if (sellPx && buyPx) {
        const oracleBuy = (sellUnits * sellPx) / buyPx;
        const bps = Math.round(((ammBuy - oracleBuy) / oracleBuy) * 10_000);
        tagged.issues = [...issues, ...(live.issues ?? []), `basis ${bps} bps vs Chainlink`];

        if (Math.abs(bps) > BASIS_REJECT_BPS) {
          return {
            ...tagged,
            ok: false,
            executable: false,
            error: "AMM quote deviates too far from the Chainlink risk price.",
          };
        }
      } else {
        tagged.issues = [...issues, ...(live.issues ?? [])];
      }

      return tagged;
    }

    // No live route found: disable execution and show plain message
    return {
      ok: false,
      source: "oracle",
      sellToken: pair.sellToken,
      buyToken: pair.buyToken,
      sellAmount: data.sellAmount,
      buyAmount: "0",
      price: "0",
      executable: false,
      issues,
      error: "No official USDC pool for this stock yet. You cannot buy or sell here.",
    };
  });

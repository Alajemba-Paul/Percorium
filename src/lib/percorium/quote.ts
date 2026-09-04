import { createServerFn } from "@tanstack/react-start";
import { parseUnits } from "viem";
import {
  ALLOWED_TRADE_TOKENS,
  BASIS_REJECT_BPS,
  STOCK_BY_ADDRESS,
  USDC,
} from "./constants";
import { getPublicClient } from "./rpc";
import { AGGREGATOR_V3_ABI } from "./abis";
import type { QuoteRequest, QuoteResult } from "./types";

function isAllowed(addr: string) {
  return ALLOWED_TRADE_TOKENS.has(addr.toLowerCase());
}

function tokenDecimals(addr: string): number {
  return addr.toLowerCase() === USDC.toLowerCase() ? 6 : 18;
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

async function quote0x(req: QuoteRequest, taker: string): Promise<QuoteResult | null> {
  const key = process.env.ZERO_EX_API_KEY;
  if (!key) return null;
  const url = new URL("https://api.0x.org/swap/allowance-holder/quote");
  url.searchParams.set("chainId", "8453");
  url.searchParams.set("sellToken", req.sellToken);
  url.searchParams.set("buyToken", req.buyToken);
  url.searchParams.set("sellAmount", req.sellAmount);
  url.searchParams.set("taker", taker);
  const res = await fetch(url, {
    headers: {
      "0x-api-key": key,
      "0x-version": "v2",
      accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    buyAmount?: string;
    sellAmount?: string;
    transaction?: { to?: string; data?: string; value?: string; gas?: string };
    issues?: { allowance?: { spender?: string } };
    minBuyAmount?: string;
  };
  if (!json.buyAmount) return null;
  return {
    ok: true,
    source: "0x",
    sellToken: req.sellToken,
    buyToken: req.buyToken,
    sellAmount: json.sellAmount ?? req.sellAmount,
    buyAmount: json.buyAmount,
    minBuyAmount: json.minBuyAmount,
    price: "0",
    estimatedGas: json.transaction?.gas,
    to: json.transaction?.to as `0x${string}` | undefined,
    data: json.transaction?.data as `0x${string}` | undefined,
    value: json.transaction?.value ?? "0",
    allowanceTarget: json.issues?.allowance?.spender as `0x${string}` | undefined,
  };
}

async function quote1inch(req: QuoteRequest, taker: string): Promise<QuoteResult | null> {
  const key = process.env.ONEINCH_API_KEY;
  if (!key) return null;
  const url = new URL("https://api.1inch.com/swap/v6.1/8453/swap");
  url.searchParams.set("src", req.sellToken);
  url.searchParams.set("dst", req.buyToken);
  url.searchParams.set("amount", req.sellAmount);
  url.searchParams.set("from", taker);
  url.searchParams.set("slippage", "1");
  url.searchParams.set("disableEstimate", "true");
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    dstAmount?: string;
    tx?: { to?: string; data?: string; value?: string; gas?: number };
  };
  if (!json.dstAmount) return null;
  return {
    ok: true,
    source: "1inch",
    sellToken: req.sellToken,
    buyToken: req.buyToken,
    sellAmount: req.sellAmount,
    buyAmount: json.dstAmount,
    price: "0",
    estimatedGas: json.tx?.gas ? String(json.tx.gas) : undefined,
    to: json.tx?.to as `0x${string}` | undefined,
    data: json.tx?.data as `0x${string}` | undefined,
    value: json.tx?.value ?? "0",
    allowanceTarget: json.tx?.to as `0x${string}` | undefined,
  };
}

export const fetchSwapQuote = createServerFn({ method: "POST" })
  .validator((d: QuoteRequest) => d)
  .handler(async ({ data }): Promise<QuoteResult> => {
    const issues: string[] = [];
    if (!isAllowed(data.sellToken) || !isAllowed(data.buyToken)) {
      return {
        ok: false,
        source: "oracle",
        sellToken: data.sellToken,
        buyToken: data.buyToken,
        sellAmount: data.sellAmount,
        buyAmount: "0",
        price: "0",
        error: "Token is not an official Coinbase B20 stock or USDC.",
        issues: ["allowlist"],
      };
    }

    const taker = data.taker ?? "0x0000000000000000000000000000000000000001";
    let live: QuoteResult | null = null;
    try {
      live = await quote0x(data, taker);
    } catch {
      issues.push("0x unavailable");
    }
    if (!live) {
      try {
        live = await quote1inch(data, taker);
        if (live) issues.push("fell back to 1inch");
      } catch {
        issues.push("1inch unavailable");
      }
    }

    const sellDec = tokenDecimals(data.sellToken);
    const buyDec = tokenDecimals(data.buyToken);
    const sellUnits = Number(data.sellAmount) / 10 ** sellDec;
    const [sellPx, buyPx] = await Promise.all([
      oraclePx(data.sellToken),
      oraclePx(data.buyToken),
    ]);

    if (!sellPx || !buyPx) {
      return {
        ok: false,
        source: "oracle",
        ...data,
        buyAmount: "0",
        price: "0",
        error: "Missing Chainlink price",
        issues,
      };
    }

    const oracleBuy = (sellUnits * sellPx) / buyPx;
    const oracleBuyRaw = parseUnits(oracleBuy.toFixed(buyDec), buyDec).toString();

    if (live) {
      const ammBuy = Number(live.buyAmount) / 10 ** buyDec;
      const bps = Math.round(((ammBuy - oracleBuy) / oracleBuy) * 10_000);
      if (Math.abs(bps) > BASIS_REJECT_BPS) {
        return {
          ...live,
          ok: false,
          price: (ammBuy / sellUnits).toString(),
          issues: [...issues, `basis ${bps} bps vs Chainlink exceeds cap`],
          error: "AMM quote deviates too far from the Chainlink risk price.",
        };
      }
      return {
        ...live,
        price: (ammBuy / sellUnits).toString(),
        issues: [...issues, `basis ${bps} bps vs Chainlink`],
      };
    }

    issues.push("No 0x/1inch key — showing Chainlink-indicative size. Execution is disabled.");
    return {
      ok: false,
      source: "oracle",
      sellToken: data.sellToken,
      buyToken: data.buyToken,
      sellAmount: data.sellAmount,
      buyAmount: oracleBuyRaw,
      price: (oracleBuy / sellUnits).toString(),
      issues,
      error: "Live router quote unavailable. Ticket is fail-closed.",
    };
  });

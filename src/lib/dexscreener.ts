import { createServerFn } from "@tanstack/react-start";
import { STOCK_BY_ADDRESS, STOCKS, USDC } from "@/lib/percorium/constants";

export type DexPriceChange = {
  m5?: number;
  h1?: number;
  h6?: number;
  h24?: number;
};

export type DexPairView = {
  pairAddress: `0x${string}`;
  dexId: string;
  priceUsd: number;
  priceNative: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange: DexPriceChange;
  token: `0x${string}`;
};

type RawToken = { address?: string; symbol?: string; name?: string };
type RawPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceUsd?: string | number;
  priceNative?: string | number;
  baseToken?: RawToken;
  quoteToken?: RawToken;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: DexPriceChange;
};

const TTL_MS = 60_000;
const USDC_LC = USDC.toLowerCase();
const AERO_LIQ_BAND = 0.8;

type CacheEntry<T> = { at: number; value: T };
const tokenCache = new Map<string, CacheEntry<DexPairView | null>>();
let boardCache: CacheEntry<Record<string, DexPairView | null>> | null = null;

function isOfficial(addr: string) {
  return Boolean(STOCK_BY_ADDRESS[addr.toLowerCase()]);
}

function num(v: string | number | undefined): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sameAddr(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Percorium/1.0",
    },
  });
  if (res.status === 429) {
    const err = new Error("dexscreener-rate-limit");
    throw err;
  }
  if (!res.ok) throw new Error(`dexscreener ${res.status}`);
  return res.json();
}

function asPairs(raw: unknown): RawPair[] {
  if (Array.isArray(raw)) return raw as RawPair[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { pairs?: unknown }).pairs)) {
    return (raw as { pairs: RawPair[] }).pairs;
  }
  return [];
}

function usdcPairsForToken(pairs: RawPair[], token: string): RawPair[] {
  const lc = token.toLowerCase();
  return pairs.filter((p) => {
    if ((p.chainId ?? "base").toLowerCase() !== "base") return false;
    if (!p.pairAddress) return false;
    return sameAddr(p.baseToken?.address, lc) && sameAddr(p.quoteToken?.address, USDC_LC);
  });
}

function pickPair(pairs: RawPair[], token: string): DexPairView | null {
  if (!isOfficial(token)) return null;
  const usdc = usdcPairsForToken(pairs, token);
  if (!usdc.length) return null;
  usdc.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const deepest = usdc[0];
  const aero = usdc.find((p) => (p.dexId ?? "").toLowerCase().includes("aerodrome"));
  const chosen =
    aero && (aero.liquidity?.usd ?? 0) >= (deepest.liquidity?.usd ?? 0) * AERO_LIQ_BAND
      ? aero
      : deepest;
  const pairAddress = chosen.pairAddress;
  if (!pairAddress) return null;
  return {
    pairAddress: pairAddress as `0x${string}`,
    dexId: chosen.dexId ?? "unknown",
    priceUsd: num(chosen.priceUsd),
    priceNative: num(chosen.priceNative),
    liquidityUsd: chosen.liquidity?.usd ?? 0,
    volume24h: chosen.volume?.h24 ?? 0,
    priceChange: {
      m5: chosen.priceChange?.m5,
      h1: chosen.priceChange?.h1,
      h6: chosen.priceChange?.h6,
      h24: chosen.priceChange?.h24,
    },
    token: token.toLowerCase() as `0x${string}`,
  };
}

async function fetchTokenPairs(token: string): Promise<RawPair[]> {
  const url = `https://api.dexscreener.com/token-pairs/v1/base/${token}`;
  return asPairs(await getJson(url));
}

async function fetchBoardPairs(): Promise<RawPair[]> {
  const joined = STOCKS.map((s) => s.address).join(",");
  const url = `https://api.dexscreener.com/tokens/v1/base/${joined}`;
  try {
    return asPairs(await getJson(url));
  } catch {
    const chunks = await Promise.all(
      STOCKS.map((s) => fetchTokenPairs(s.address).catch(() => [] as RawPair[])),
    );
    return chunks.flat();
  }
}

export async function selectOfficialUsdcPair(
  token: string,
): Promise<DexPairView | null> {
  const lc = token.toLowerCase();
  if (!isOfficial(lc)) return null;
  const hit = tokenCache.get(lc);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const pairs = await fetchTokenPairs(token);
    const view = pickPair(pairs, lc);
    tokenCache.set(lc, { at: Date.now(), value: view });
    return view;
  } catch {
    if (hit) return hit.value;
    tokenCache.set(lc, { at: Date.now(), value: null });
    return null;
  }
}

export async function selectOfficialUsdcBoard(): Promise<
  Record<string, DexPairView | null>
> {
  if (boardCache && Date.now() - boardCache.at < TTL_MS) return boardCache.value;
  try {
    const pairs = await fetchBoardPairs();
    const out: Record<string, DexPairView | null> = {};
    for (const stock of STOCKS) {
      const view = pickPair(
        pairs.filter((p) => sameAddr(p.baseToken?.address, stock.address)),
        stock.address,
      );
      out[stock.address.toLowerCase()] = view;
      tokenCache.set(stock.address.toLowerCase(), {
        at: Date.now(),
        value: view,
      });
    }
    boardCache = { at: Date.now(), value: out };
    return out;
  } catch {
    if (boardCache) return boardCache.value;
    const out: Record<string, DexPairView | null> = {};
    for (const stock of STOCKS) out[stock.address.toLowerCase()] = null;
    return out;
  }
}

export const fetchOfficialUsdcPair = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<DexPairView | null> => {
    return selectOfficialUsdcPair(data.token);
  });

export const fetchOfficialUsdcBoard = createServerFn({
  method: "GET",
}).handler(async (): Promise<Record<string, DexPairView | null>> => {
  return selectOfficialUsdcBoard();
});

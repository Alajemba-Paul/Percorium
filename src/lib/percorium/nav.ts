import {
  DEFAULT_INDEX_LTV_BPS,
  PROTOCOL_FEE_BPS,
  type StockSymbol,
} from "./constants";

export type WeightMap = Partial<Record<StockSymbol, number>>;

export function normalizeWeights(weights: WeightMap): Record<StockSymbol, number> {
  const entries = Object.entries(weights).filter(([, w]) => (w ?? 0) > 0) as [
    StockSymbol,
    number,
  ][];
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  const out = {} as Record<StockSymbol, number>;
  if (sum <= 0) return out;
  for (const [k, w] of entries) out[k] = w / sum;
  return out;
}

export function normalizeWeightsList(weights: WeightMap): { symbol: StockSymbol; pct: number; fraction: number }[] {
  const norm = normalizeWeights(weights);
  return (Object.keys(norm) as StockSymbol[]).map((symbol) => ({
    symbol,
    pct: Number((norm[symbol] * 100).toFixed(1)),
    fraction: norm[symbol],
  }));
}

export function weightBps(weights: WeightMap): Record<StockSymbol, number> {
  const n = normalizeWeights(weights);
  const out = {} as Record<StockSymbol, number>;
  let allocated = 0;
  const keys = Object.keys(n) as StockSymbol[];
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = 10_000 - allocated;
    } else {
      const bps = Math.round(n[k] * 10_000);
      out[k] = bps;
      allocated += bps;
    }
  });
  return out;
}

/** NAV_t = (sum q_i * P_i + C) / S. At T0 with S=0, NAV = 1. */
export function indexNav(params: {
  inventory: Partial<Record<StockSymbol, number>>;
  prices: Partial<Record<StockSymbol, number>>;
  cashUsdc: number;
  supply: number;
}): number {
  let assets = params.cashUsdc;
  for (const [sym, qty] of Object.entries(params.inventory)) {
    const px = params.prices[sym as StockSymbol] ?? 0;
    assets += (qty ?? 0) * px;
  }
  if (params.supply <= 0) return 1;
  return assets / params.supply;
}

export function sharesFromMint(usdcNet: number, nav: number): number {
  if (nav <= 0) return 0;
  return usdcNet / nav;
}

export function applyProtocolFee(usdcGross: number, feeBps = PROTOCOL_FEE_BPS) {
  const fee = (usdcGross * feeBps) / 10_000;
  return { fee, net: usdcGross - fee };
}

export function healthFactor(params: {
  nav: number;
  shares: number;
  debtUsdc: number;
  ltvBps?: number;
}): number {
  const ltv = (params.ltvBps ?? DEFAULT_INDEX_LTV_BPS) / 10_000;
  if (params.debtUsdc <= 0) return Number.POSITIVE_INFINITY;
  return (params.nav * params.shares * ltv) / params.debtUsdc;
}

export function liquidationPriceUsdc(params: {
  nav: number;
  shares: number;
  debtUsdc: number;
  ltvBps?: number;
}): number {
  const ltv = (params.ltvBps ?? DEFAULT_INDEX_LTV_BPS) / 10_000;
  if (params.shares <= 0 || ltv <= 0) return 0;
  return params.debtUsdc / (params.shares * ltv);
}

export function basisBps(amm: number, oracle: number): number {
  if (!oracle) return 0;
  return Math.round(((amm - oracle) / oracle) * 10_000);
}

export function allocateUsdcToBasket(
  usdcNet: number,
  weights: WeightMap,
  prices: Partial<Record<StockSymbol, number>>,
): { symbol: StockSymbol; usdc: number; units: number }[] {
  const n = normalizeWeights(weights);
  return (Object.keys(n) as StockSymbol[]).map((symbol) => {
    const usdc = usdcNet * n[symbol];
    const px = prices[symbol] ?? 0;
    return { symbol, usdc, units: px > 0 ? usdc / px : 0 };
  });
}

import type { StockSymbol } from "./constants";
import { indexNav, sharesFromMint, applyProtocolFee, allocateUsdcToBasket } from "./nav";

export type IndexSlab = {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  weights: Partial<Record<StockSymbol, number>>;
  inventory: Partial<Record<StockSymbol, number>>;
  cashUsdc: number;
  supply: number;
  createdAt: number;
  feeBps: number;
  maxLtvBps: number;
  /** Local workshop flag — factory not yet on mainnet. */
  workshop: true;
};

const KEY = "percorium-slabs-v1";

const SEED: IndexSlab[] = [
  {
    id: "mag4",
    name: "Mag 4",
    symbol: "MAG4",
    creator: "Percorium",
    weights: { NVDAc: 35, AAPLc: 25, MSFTc: 20, GOOGLc: 20 },
    inventory: {},
    cashUsdc: 0,
    supply: 0,
    createdAt: Date.UTC(2026, 7, 25),
    feeBps: 30,
    maxLtvBps: 6000,
    workshop: true,
  },
  {
    id: "base-beta",
    name: "Base Beta",
    symbol: "BBETA",
    creator: "Percorium",
    weights: { NVDAc: 40, COINc: 40, CRCLc: 20 },
    inventory: {},
    cashUsdc: 0,
    supply: 0,
    createdAt: Date.UTC(2026, 7, 26),
    feeBps: 30,
    maxLtvBps: 6000,
    workshop: true,
  },
];

function read(): IndexSlab[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    const parsed = JSON.parse(raw) as IndexSlab[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED;
    return parsed;
  } catch {
    return SEED;
  }
}

function write(slabs: IndexSlab[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(slabs));
}

export function listSlabs(): IndexSlab[] {
  return read();
}

export function getSlab(id: string): IndexSlab | undefined {
  return read().find((s) => s.id === id);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 24) || `idx-${Date.now().toString(36)}`
  );
}

export function createSlab(input: {
  name: string;
  symbol: string;
  creator: string;
  weights: Partial<Record<StockSymbol, number>>;
}): IndexSlab {
  const slabs = read();
  const id = slugify(input.symbol || input.name);
  const unique =
    slabs.some((s) => s.id === id) ? `${id}-${Date.now().toString(36)}` : id;
  const slab: IndexSlab = {
    id: unique,
    name: input.name.trim(),
    symbol: input.symbol.trim().toUpperCase().slice(0, 8),
    creator: input.creator,
    weights: input.weights,
    inventory: {},
    cashUsdc: 0,
    supply: 0,
    createdAt: Date.now(),
    feeBps: 30,
    maxLtvBps: 6000,
    workshop: true,
  };
  write([slab, ...slabs]);
  return slab;
}

export function mintSlab(
  id: string,
  usdcGross: number,
  prices: Partial<Record<StockSymbol, number>>,
): IndexSlab | undefined {
  const slabs = read();
  const i = slabs.findIndex((s) => s.id === id);
  if (i < 0) return;
  const slab = slabs[i];
  if (!slab) return;
  const nav = indexNav({
    inventory: slab.inventory,
    prices,
    cashUsdc: slab.cashUsdc,
    supply: slab.supply,
  });
  const { net } = applyProtocolFee(usdcGross, slab.feeBps);
  const shares = sharesFromMint(net, nav);
  const fills = allocateUsdcToBasket(net, slab.weights, prices);
  const inventory = { ...slab.inventory };
  for (const f of fills) {
    inventory[f.symbol] = (inventory[f.symbol] ?? 0) + f.units;
  }
  const next: IndexSlab = {
    ...slab,
    inventory,
    supply: slab.supply + shares,
  };
  slabs[i] = next;
  write(slabs);
  return next;
}

export function redeemSlab(
  id: string,
  shares: number,
  asUsdc: boolean,
  prices: Partial<Record<StockSymbol, number>>,
): IndexSlab | undefined {
  const slabs = read();
  const i = slabs.findIndex((s) => s.id === id);
  if (i < 0) return;
  const slab = slabs[i];
  if (!slab) return;
  if (shares <= 0 || shares > slab.supply) return slab;
  const ratio = shares / slab.supply;
  const inventory = { ...slab.inventory };
  let cash = slab.cashUsdc * (1 - ratio);
  if (asUsdc) {
    let proceeds = slab.cashUsdc * ratio;
    for (const k of Object.keys(inventory) as StockSymbol[]) {
      const qty = (inventory[k] ?? 0) * ratio;
      proceeds += qty * (prices[k] ?? 0);
      inventory[k] = (inventory[k] ?? 0) - qty;
    }
    cash = slab.cashUsdc - slab.cashUsdc * ratio;
    void proceeds;
  } else {
    for (const k of Object.keys(inventory) as StockSymbol[]) {
      inventory[k] = (inventory[k] ?? 0) * (1 - ratio);
    }
  }
  const next: IndexSlab = {
    ...slab,
    inventory,
    cashUsdc: cash,
    supply: slab.supply - shares,
  };
  slabs[i] = next;
  write(slabs);
  return next;
}

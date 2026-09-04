import type { StockSymbol } from "./constants";

export type FeedStatus = "live" | "holding" | "stale" | "paused";

export type StockQuote = {
  symbol: StockSymbol;
  address: `0x${string}`;
  feed: `0x${string}`;
  oracle: number;
  updatedAt: number;
  roundId: string;
  status: FeedStatus;
  multiplier: number | null;
  amm: number | null;
  basisBps: number | null;
};

export type SequencerState = {
  up: boolean;
  startedAt: number;
  grace: boolean;
};

export type PriceBoard = {
  sequencer: SequencerState;
  stocks: StockQuote[];
  fetchedAt: number;
  rpc: string;
  error?: string;
};

export type SwapSide = "buy" | "sell" | "swap";

export type QuoteRequest = {
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: string;
  taker?: `0x${string}`;
};

export type QuoteResult = {
  ok: boolean;
  source: "0x" | "1inch" | "oracle";
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: string;
  buyAmount: string;
  minBuyAmount?: string;
  price: string;
  estimatedGas?: string;
  to?: `0x${string}`;
  data?: `0x${string}`;
  value?: string;
  allowanceTarget?: `0x${string}`;
  issues?: string[];
  error?: string;
};

export type MorphoMarketView = {
  uniqueKey: string;
  collateral: `0x${string}`;
  loan: `0x${string}`;
  lltv: number;
  supplyApy: number;
  borrowApy: number;
  liquidity: number;
  oracle?: `0x${string}`;
  irm?: `0x${string}`;
};

export type Eligibility = {
  country: string | null;
  restricted: boolean;
  source: "header" | "unknown";
};

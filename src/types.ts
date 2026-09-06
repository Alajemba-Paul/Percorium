import type { StockSymbol } from "./lib/percorium/constants";

export interface StockPriceData {
  symbol: StockSymbol | string;
  name: string;
  sector: string;
  token: string;
  ammPrice: number;
  chainlinkPrice: number;
  change24h: number;
  basisBps: number;
}

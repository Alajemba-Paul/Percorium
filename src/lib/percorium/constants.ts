export const BASE_CHAIN_ID = 8453;
export const BASE_BUILDER_CODE = "bc_ynyk4o6j" as const;
export const BASE_BUILDER_WALLET = "0x1A4a4ff8e50468F9Bea313E87C061e032390798F" as const;

export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
/** Onchain ERC-20 decimals. USDC=6. Coinbase B20 stocks=8 (verified on Base). */
export const USDC_DECIMALS = 6;
export const B20_DECIMALS = 8;
export const WETH = "0x4200000000000000000000000000000000000006" as const;
export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
export const UNI_V4_UNIVERSAL_ROUTER =
  "0x6fF5693b99212Da76ad316178A184AB56D299b43" as const;

/** Legacy Slipstream (pre-Gauges V3). B20 USDC books are NOT here. */
export const AERO_SLIPSTREAM_ROUTER_LEGACY =
  "0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5" as const;
export const AERO_SLIPSTREAM_FACTORY_LEGACY =
  "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A" as const;
export const AERO_SLIPSTREAM_QUOTER_LEGACY =
  "0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0" as const;

/** Gauges V3 / Slipstream 3 — live B20 USDC pools. Simulated 2026-09-10. */
export const AERO_SLIPSTREAM_ROUTER =
  "0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F" as const;
export const AERO_SLIPSTREAM_NFPM =
  "0xe1f8cd9AC4e4A65F54f38a5CdAfCA44f6dD68b53" as const;
export const AERO_SLIPSTREAM_FACTORY =
  "0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef" as const;
export const AERO_SLIPSTREAM_QUOTER_V2 =
  "0x514c8B5f54112481E28028F1166Bd78501089259" as const;
export const AERO_UNIVERSAL_ROUTER =
  "0x6Cb442acF35158D5eDa88fe602221b67B400Be3E" as const;
export const AERO_ROUTER =
  "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as const;
export const AERO_FACTORY =
  "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as const;
export const ZERO_EX_ALLOWANCE_HOLDER =
  "0x0000000000001fF3684f28c67538d4D072C22734" as const;

export const SLIPSTREAM_TICK_SPACINGS = [10, 1, 50, 100, 200] as const;

/** Official B20 / USDC Slipstream V3 pools (factory getPool, tick 10). */
export const SLIPSTREAM_USDC_POOLS: Record<string, `0x${string}`> = {
  "0xb200000000000000000000c2e324d24d7eecd1fb": "0xa3b1e3f9747065e2073722ff4c9027d3ea4994f0",
  "0xb200000000000000000000d9192b6b456483c2e8": "0xd03bc8c7f2faedce2aac81bf0444aea08ea06e9b",
  "0xb2000000000000000000002d0ba3164cc74f58b7": "0xb1987cad1682841b4b641d50e520777ec5ab5542",
  "0xb2000000000000000000008bc8786b856e61707c": "0xeaf57753bc382e0324a1d43f72e7027705a2273e",
  "0xb200000000000000000000ab99cfa739e253872b": "0x7103eb3c9590d1281f7dc03b2a9ee27c39df5d54",
  "0xb2000000000000000000004884b426556b92883d": "0x8b27f626ab668197000bc722a1012022caed10e2",
  "0xb20000000000000000000078ee7ce2fe4908108c": "0x853f5f1b92b16714fe6cda67caad0856b83c7ab9",
  "0xb200000000000000000000397293cb8cda9a10c5": "0x5a8236f575471e7bfca2c8462a200c28f737246e",
  "0xb2000000000000000000007b9fcbd005511acbd5": "0x0bf58fe0fac935ac69595c19b12ba0d75e3f8c0e",
  "0xb2000000000000000000001e800a7f5189430cd0": "0x469337fdcc5e8f38e2e4b670b04f57865d13a7bb",
};

export const B20_FACTORY = "0xB20f000000000000000000000000000000000000" as const;
export const B20_ACTIVATION_REGISTRY =
  "0x8453000000000000000000000000000000000001" as const;
export const B20_POLICY_REGISTRY =
  "0x8453000000000000000000000000000000000002" as const;
export const COINBASE_STOCKS_REGISTRY =
  "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD" as const;

export const CHAINLINK_SEQUENCER_UPTIME =
  "0xBCF85224fc0756B9Fa45aA7892530B47e10b6433" as const;

export const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as const;

export const AAVE_V3_POOL_BASE =
  "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as const;

/** 24h heartbeat + buffer. Weekend holds of last close are expected, not paused. */
export const FEED_HEARTBEAT_SEC = 24 * 60 * 60;
export const FEED_STALE_SEC = 36 * 60 * 60;
export const FEED_PAUSE_SEC = 48 * 60 * 60;
export const SEQUENCER_GRACE_SEC = 3600;
export const BASIS_WARN_BPS = 150;
export const BASIS_REJECT_BPS = 400;
export const DEFAULT_INDEX_LTV_BPS = 6000;
export const PROTOCOL_FEE_BPS = 30;
export const CREATOR_ROYALTY_BPS = 6;
export const MAX_INDEX_NAMES = 10;
export const MIN_INDEX_NAMES = 2;

export const CB_STOCKS = {
  AAPLc: "0xb200000000000000000000C2e324d24d7eEcd1fb",
  AMZNc: "0xb200000000000000000000d9192b6B456483C2E8",
  COINc: "0xb200000000000000000000c85a31389D71F3ecfb",
  CRCLc: "0xB20000000000000000000019f6E7C675b73C2e4D",
  GOOGLc: "0xb2000000000000000000002D0BA3164cc74f58B7",
  INTCc: "0xB2000000000000000000004AFF16039bA04bdFBc",
  METAc: "0xb2000000000000000000008bC8786B856E61707C",
  MSFTc: "0xB200000000000000000000Ab99cFa739E253872B",
  MSTRc: "0xb2000000000000000000004884b426556b92883d",
  NVDAc: "0xb20000000000000000000078ee7ce2fE4908108C",
  SNDKc: "0xb200000000000000000000397293Cb8cda9a10c5",
  SPCXc: "0xb2000000000000000000007b9fcbd005511aCBd5",
  TSLAc: "0xb2000000000000000000001e800a7f5189430cD0",
} as const;

export type StockSymbol = keyof typeof CB_STOCKS;

export const CHAINLINK_CB = {
  AAPL: "0x787f13dEa48Db0897CbCDD985de77809D837F988",
  AMZN: "0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295",
  COIN: "0x408e44f504A7371a345F03a73dDC96A4b48e8aa7",
  CRCL: "0x0231cF2635D1E17bB5c2462cc7504Ba1fBd61f33",
  GOOGL: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2",
  INTC: "0xAB657C39bac0D5886250D70849e2E3E008F2EECB",
  META: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D",
  MSFT: "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c",
  MSTR: "0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a",
  NVDA: "0x04689a41629776563E6822F76f2e57D148d28513",
  SNDK: "0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA",
  SPCX: "0x6A634B235903C4ad6376892180d6fF8612e3Fa68",
  TSLA: "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4",
} as const;

export type FeedKey = keyof typeof CHAINLINK_CB;

export type StockMeta = {
  symbol: StockSymbol;
  underlying: FeedKey;
  name: string;
  company: string;
  sector: string;
  address: `0x${string}`;
  feed: `0x${string}`;
  listed: boolean;
};

export const STOCKS: readonly StockMeta[] = [
  { symbol: "AAPLc", underlying: "AAPL", name: "Apple", company: "Apple Inc.", sector: "Technology", address: CB_STOCKS.AAPLc, feed: CHAINLINK_CB.AAPL, listed: true },
  { symbol: "AMZNc", underlying: "AMZN", name: "Amazon", company: "Amazon.com, Inc.", sector: "Consumer", address: CB_STOCKS.AMZNc, feed: CHAINLINK_CB.AMZN, listed: true },
  { symbol: "COINc", underlying: "COIN", name: "Coinbase", company: "Coinbase Global, Inc.", sector: "Crypto", address: CB_STOCKS.COINc, feed: CHAINLINK_CB.COIN, listed: true },
  { symbol: "CRCLc", underlying: "CRCL", name: "Circle", company: "Circle Internet Group", sector: "Crypto", address: CB_STOCKS.CRCLc, feed: CHAINLINK_CB.CRCL, listed: true },
  { symbol: "GOOGLc", underlying: "GOOGL", name: "Alphabet", company: "Alphabet Inc.", sector: "Technology", address: CB_STOCKS.GOOGLc, feed: CHAINLINK_CB.GOOGL, listed: true },
  { symbol: "INTCc", underlying: "INTC", name: "Intel", company: "Intel Corporation", sector: "Semiconductors", address: CB_STOCKS.INTCc, feed: CHAINLINK_CB.INTC, listed: true },
  { symbol: "METAc", underlying: "META", name: "Meta", company: "Meta Platforms, Inc.", sector: "Technology", address: CB_STOCKS.METAc, feed: CHAINLINK_CB.META, listed: true },
  { symbol: "MSFTc", underlying: "MSFT", name: "Microsoft", company: "Microsoft Corporation", sector: "Technology", address: CB_STOCKS.MSFTc, feed: CHAINLINK_CB.MSFT, listed: true },
  { symbol: "MSTRc", underlying: "MSTR", name: "Strategy", company: "Strategy Inc.", sector: "Bitcoin treasury", address: CB_STOCKS.MSTRc, feed: CHAINLINK_CB.MSTR, listed: true },
  { symbol: "NVDAc", underlying: "NVDA", name: "NVIDIA", company: "NVIDIA Corporation", sector: "Semiconductors", address: CB_STOCKS.NVDAc, feed: CHAINLINK_CB.NVDA, listed: true },
  { symbol: "SNDKc", underlying: "SNDK", name: "Sandisk", company: "Sandisk Corporation", sector: "Semiconductors", address: CB_STOCKS.SNDKc, feed: CHAINLINK_CB.SNDK, listed: true },
  { symbol: "SPCXc", underlying: "SPCX", name: "SpaceX", company: "Space Exploration Technologies", sector: "Aerospace", address: CB_STOCKS.SPCXc, feed: CHAINLINK_CB.SPCX, listed: true },
  { symbol: "TSLAc", underlying: "TSLA", name: "Tesla", company: "Tesla, Inc.", sector: "Automotive", address: CB_STOCKS.TSLAc, feed: CHAINLINK_CB.TSLA, listed: true },
] as const;

export const STOCK_BY_SYMBOL: Record<StockSymbol, StockMeta> = Object.fromEntries(
  STOCKS.map((s) => [s.symbol, s]),
) as Record<StockSymbol, StockMeta>;

export const STOCK_BY_ADDRESS: Record<string, StockMeta> = Object.fromEntries(
  STOCKS.map((s) => [s.address.toLowerCase(), s]),
) as Record<string, StockMeta>;

export const ALLOWED_TRADE_TOKENS = new Set<string>([
  USDC.toLowerCase(),
  ...STOCKS.map((s) => s.address.toLowerCase()),
]);

export const BASE_RPC_FALLBACKS = [
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://developer-access-mainnet.base.org",
  "https://base.drpc.org",
] as const;

export const RESTRICTED_COUNTRIES = new Set([
  "US", "PR", "GU", "VI", "AS", "MP", "CU", "IR", "KP", "SY", "RU", "BY",
]);

export const COMPLIANCE_COPY =
  "Coinbase tokenized stocks are only available to users outside the US.";

export const BASE_CHAIN_ID = 8453;

export const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const WETH = "0x4200000000000000000000000000000000000006" as const;
export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
export const UNI_V4_UNIVERSAL_ROUTER =
  "0x6fF5693b99212Da76ad316178A184AB56D299b43" as const;
export const ONEINCH_ROUTER_V6 =
  "0x111111125421ca6dc452d289314280a0f8842a65" as const;

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
export const CREATOR_ROYALTY_BPS = 6; // 20% of 30bps
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
  {
    symbol: "AAPLc",
    underlying: "AAPL",
    name: "Apple",
    company: "Apple Inc.",
    sector: "Technology",
    address: CB_STOCKS.AAPLc,
    feed: CHAINLINK_CB.AAPL,
    listed: true,
  },
  {
    symbol: "AMZNc",
    underlying: "AMZN",
    name: "Amazon",
    company: "Amazon.com, Inc.",
    sector: "Consumer",
    address: CB_STOCKS.AMZNc,
    feed: CHAINLINK_CB.AMZN,
    listed: true,
  },
  {
    symbol: "COINc",
    underlying: "COIN",
    name: "Coinbase",
    company: "Coinbase Global, Inc.",
    sector: "Crypto",
    address: CB_STOCKS.COINc,
    feed: CHAINLINK_CB.COIN,
    listed: true,
  },
  {
    symbol: "CRCLc",
    underlying: "CRCL",
    name: "Circle",
    company: "Circle Internet Group",
    sector: "Crypto",
    address: CB_STOCKS.CRCLc,
    feed: CHAINLINK_CB.CRCL,
    listed: true,
  },
  {
    symbol: "GOOGLc",
    underlying: "GOOGL",
    name: "Alphabet",
    company: "Alphabet Inc.",
    sector: "Technology",
    address: CB_STOCKS.GOOGLc,
    feed: CHAINLINK_CB.GOOGL,
    listed: true,
  },
  {
    symbol: "INTCc",
    underlying: "INTC",
    name: "Intel",
    company: "Intel Corporation",
    sector: "Semiconductors",
    address: CB_STOCKS.INTCc,
    feed: CHAINLINK_CB.INTC,
    listed: true,
  },
  {
    symbol: "METAc",
    underlying: "META",
    name: "Meta",
    company: "Meta Platforms, Inc.",
    sector: "Technology",
    address: CB_STOCKS.METAc,
    feed: CHAINLINK_CB.META,
    listed: true,
  },
  {
    symbol: "MSFTc",
    underlying: "MSFT",
    name: "Microsoft",
    company: "Microsoft Corporation",
    sector: "Technology",
    address: CB_STOCKS.MSFTc,
    feed: CHAINLINK_CB.MSFT,
    listed: true,
  },
  {
    symbol: "MSTRc",
    underlying: "MSTR",
    name: "Strategy",
    company: "Strategy Inc.",
    sector: "Bitcoin treasury",
    address: CB_STOCKS.MSTRc,
    feed: CHAINLINK_CB.MSTR,
    listed: true,
  },
  {
    symbol: "NVDAc",
    underlying: "NVDA",
    name: "NVIDIA",
    company: "NVIDIA Corporation",
    sector: "Semiconductors",
    address: CB_STOCKS.NVDAc,
    feed: CHAINLINK_CB.NVDA,
    listed: true,
  },
  {
    symbol: "SNDKc",
    underlying: "SNDK",
    name: "Sandisk",
    company: "Sandisk Corporation",
    sector: "Semiconductors",
    address: CB_STOCKS.SNDKc,
    feed: CHAINLINK_CB.SNDK,
    listed: true,
  },
  {
    symbol: "SPCXc",
    underlying: "SPCX",
    name: "SpaceX",
    company: "Space Exploration Technologies",
    sector: "Aerospace",
    address: CB_STOCKS.SPCXc,
    feed: CHAINLINK_CB.SPCX,
    listed: true,
  },
  {
    symbol: "TSLAc",
    underlying: "TSLA",
    name: "Tesla",
    company: "Tesla, Inc.",
    sector: "Automotive",
    address: CB_STOCKS.TSLAc,
    feed: CHAINLINK_CB.TSLA,
    listed: true,
  },
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
  "https://base.llamarpc.com",
  "https://base.drpc.org",
  "https://1rpc.io/base",
] as const;

export const RESTRICTED_COUNTRIES = new Set([
  "US",
  "PR",
  "GU",
  "VI",
  "AS",
  "MP",
  "CU",
  "IR",
  "KP",
  "SY",
  "RU",
  "BY",
]);

export const COMPLIANCE_COPY =
  "Coinbase Tokenized Stocks are only available to eligible persons outside the US.";

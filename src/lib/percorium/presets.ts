import { CB_STOCKS, type StockSymbol } from "./constants";
import { encodeBasketPayload } from "./basket";

export interface PresetBasket {
  id: string;
  name: string;
  ticker: string;
  description: string;
  defaultSpendUsdc: number;
  legs: { symbol: StockSymbol; address: string; weight: number }[];
  payload: string;
}

export const PRESET_INDICES: PresetBasket[] = [
  {
    id: "big-tech",
    name: "Big Tech Titans",
    ticker: "TITAN",
    description: "Equal-weighted exposure to Apple, Microsoft, NVIDIA, and Alphabet.",
    defaultSpendUsdc: 250,
    legs: [
      { symbol: "AAPLc", address: CB_STOCKS.AAPLc, weight: 25 },
      { symbol: "MSFTc", address: CB_STOCKS.MSFTc, weight: 25 },
      { symbol: "NVDAc", address: CB_STOCKS.NVDAc, weight: 25 },
      { symbol: "GOOGLc", address: CB_STOCKS.GOOGLc, weight: 25 },
    ],
    payload: encodeBasketPayload({
      name: "Big Tech Titans",
      spendUsdc: 250,
      legs: [
        { address: CB_STOCKS.AAPLc, weight: 25 },
        { address: CB_STOCKS.MSFTc, weight: 25 },
        { address: CB_STOCKS.NVDAc, weight: 25 },
        { address: CB_STOCKS.GOOGLc, weight: 25 },
      ],
    }),
  },
  {
    id: "crypto-equities",
    name: "Digital Asset Equities",
    ticker: "CRYPTO",
    description: "Pure-play crypto infrastructure, stablecoin issuers, and Bitcoin treasury balance sheets.",
    defaultSpendUsdc: 250,
    legs: [
      { symbol: "COINc", address: CB_STOCKS.COINc, weight: 40 },
      { symbol: "CRCLc", address: CB_STOCKS.CRCLc, weight: 30 },
      { symbol: "MSTRc", address: CB_STOCKS.MSTRc, weight: 30 },
    ],
    payload: encodeBasketPayload({
      name: "Digital Asset Equities",
      spendUsdc: 250,
      legs: [
        { address: CB_STOCKS.COINc, weight: 40 },
        { address: CB_STOCKS.CRCLc, weight: 30 },
        { address: CB_STOCKS.MSTRc, weight: 30 },
      ],
    }),
  },
  {
    id: "ai-compute",
    name: "AI & Compute Frontier",
    ticker: "AICOMP",
    description: "Foundational hardware accelerators, semiconductor fabrication, and hyperscale compute.",
    defaultSpendUsdc: 250,
    legs: [
      { symbol: "NVDAc", address: CB_STOCKS.NVDAc, weight: 40 },
      { symbol: "MSFTc", address: CB_STOCKS.MSFTc, weight: 25 },
      { symbol: "GOOGLc", address: CB_STOCKS.GOOGLc, weight: 20 },
      { symbol: "INTCc", address: CB_STOCKS.INTCc, weight: 15 },
    ],
    payload: encodeBasketPayload({
      name: "AI & Compute Frontier",
      spendUsdc: 250,
      legs: [
        { address: CB_STOCKS.NVDAc, weight: 40 },
        { address: CB_STOCKS.MSFTc, weight: 25 },
        { address: CB_STOCKS.GOOGLc, weight: 20 },
        { address: CB_STOCKS.INTCc, weight: 15 },
      ],
    }),
  },
  {
    id: "next-gen-mobility",
    name: "Next-Gen Tech & Mobility",
    ticker: "NEXUS",
    description: "Autonomous mobility, AI agents, global logistics, and aerospace technology.",
    defaultSpendUsdc: 250,
    legs: [
      { symbol: "TSLAc", address: CB_STOCKS.TSLAc, weight: 35 },
      { symbol: "AMZNc", address: CB_STOCKS.AMZNc, weight: 25 },
      { symbol: "METAc", address: CB_STOCKS.METAc, weight: 25 },
      { symbol: "SPCXc", address: CB_STOCKS.SPCXc, weight: 15 },
    ],
    payload: encodeBasketPayload({
      name: "Next-Gen Tech & Mobility",
      spendUsdc: 250,
      legs: [
        { address: CB_STOCKS.TSLAc, weight: 35 },
        { address: CB_STOCKS.AMZNc, weight: 25 },
        { address: CB_STOCKS.METAc, weight: 25 },
        { address: CB_STOCKS.SPCXc, weight: 15 },
      ],
    }),
  },
  {
    id: "mag7",
    name: "Magnificent 7",
    ticker: "MAG7",
    description: "The 7 titan mega-cap equities powering global computing, cloud, AI, and consumer tech.",
    defaultSpendUsdc: 350,
    legs: [
      { symbol: "NVDAc", address: CB_STOCKS.NVDAc, weight: 20 },
      { symbol: "AAPLc", address: CB_STOCKS.AAPLc, weight: 15 },
      { symbol: "MSFTc", address: CB_STOCKS.MSFTc, weight: 15 },
      { symbol: "AMZNc", address: CB_STOCKS.AMZNc, weight: 15 },
      { symbol: "GOOGLc", address: CB_STOCKS.GOOGLc, weight: 15 },
      { symbol: "METAc", address: CB_STOCKS.METAc, weight: 10 },
      { symbol: "TSLAc", address: CB_STOCKS.TSLAc, weight: 10 },
    ],
    payload: encodeBasketPayload({
      name: "Magnificent 7",
      spendUsdc: 350,
      legs: [
        { address: CB_STOCKS.NVDAc, weight: 20 },
        { address: CB_STOCKS.AAPLc, weight: 15 },
        { address: CB_STOCKS.MSFTc, weight: 15 },
        { address: CB_STOCKS.AMZNc, weight: 15 },
        { address: CB_STOCKS.GOOGLc, weight: 15 },
        { address: CB_STOCKS.METAc, weight: 10 },
        { address: CB_STOCKS.TSLAc, weight: 10 },
      ],
    }),
  },
];

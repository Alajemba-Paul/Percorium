import { createServerFn } from "@tanstack/react-start";
import { isAddress, getAddress } from "viem";
import {
  STOCK_BY_ADDRESS,
  STOCK_BY_SYMBOL,
  CB_STOCKS,
  type StockMeta,
  type StockSymbol,
} from "./constants";

export interface BasketLeg {
  a: `0x${string}`; // official B20 stock contract address
  w: number; // integer weight (1..99)
}

export interface BasketPayload {
  v: 1;
  name: string;
  spendUsdc: string;
  legs: BasketLeg[];
}

export interface ValidatedBasketLeg {
  stock: StockMeta;
  address: `0x${string}`;
  weight: number;
  usdcSlice: number;
}

export interface ValidatedBasket {
  isValid: true;
  version: number;
  name: string;
  spendUsdc: number;
  legs: ValidatedBasketLeg[];
  payload: string;
}

export interface InvalidBasket {
  isValid: false;
  error: string;
  rawPayload?: string;
}

export type BasketValidationResult = ValidatedBasket | InvalidBasket;

export function slugifyBasketName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "basket"
  );
}

const MEMORY_BASKETS: Record<string, string> = {};

export function registerCustomBasket(slug: string, payload: string): void {
  if (!slug || !payload) return;
  const cleanSlug = slug.toLowerCase().trim();
  MEMORY_BASKETS[cleanSlug] = payload;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = JSON.parse(
        localStorage.getItem("percorium_custom_baskets") || "{}",
      );
      existing[cleanSlug] = payload;
      localStorage.setItem("percorium_custom_baskets", JSON.stringify(existing));
    } catch {
      // storage errors ignored
    }
  }
}

export function getCustomBasketPayload(slug: string): string | null {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();
  if (MEMORY_BASKETS[cleanSlug]) return MEMORY_BASKETS[cleanSlug];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = JSON.parse(
        localStorage.getItem("percorium_custom_baskets") || "{}",
      );
      if (existing[cleanSlug]) return existing[cleanSlug];
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Built-in preset definitions by slug/id for instant direct resolution.
 */
const KNOWN_PRESET_MAP: Record<
  string,
  { name: string; spendUsdc: number; legs: { symbol: StockSymbol; weight: number }[] }
> = {
  mag7: {
    name: "Magnificent 7",
    spendUsdc: 350,
    legs: [
      { symbol: "NVDAc", weight: 20 },
      { symbol: "AAPLc", weight: 15 },
      { symbol: "MSFTc", weight: 15 },
      { symbol: "AMZNc", weight: 15 },
      { symbol: "GOOGLc", weight: 15 },
      { symbol: "METAc", weight: 10 },
      { symbol: "TSLAc", weight: 10 },
    ],
  },
  "mag-7": {
    name: "Magnificent 7",
    spendUsdc: 350,
    legs: [
      { symbol: "NVDAc", weight: 20 },
      { symbol: "AAPLc", weight: 15 },
      { symbol: "MSFTc", weight: 15 },
      { symbol: "AMZNc", weight: 15 },
      { symbol: "GOOGLc", weight: 15 },
      { symbol: "METAc", weight: 10 },
      { symbol: "TSLAc", weight: 10 },
    ],
  },
  "magnificent-7": {
    name: "Magnificent 7",
    spendUsdc: 350,
    legs: [
      { symbol: "NVDAc", weight: 20 },
      { symbol: "AAPLc", weight: 15 },
      { symbol: "MSFTc", weight: 15 },
      { symbol: "AMZNc", weight: 15 },
      { symbol: "GOOGLc", weight: 15 },
      { symbol: "METAc", weight: 10 },
      { symbol: "TSLAc", weight: 10 },
    ],
  },
  "big-tech": {
    name: "Big Tech Titans",
    spendUsdc: 250,
    legs: [
      { symbol: "AAPLc", weight: 25 },
      { symbol: "MSFTc", weight: 25 },
      { symbol: "NVDAc", weight: 25 },
      { symbol: "GOOGLc", weight: 25 },
    ],
  },
  titan: {
    name: "Big Tech Titans",
    spendUsdc: 250,
    legs: [
      { symbol: "AAPLc", weight: 25 },
      { symbol: "MSFTc", weight: 25 },
      { symbol: "NVDAc", weight: 25 },
      { symbol: "GOOGLc", weight: 25 },
    ],
  },
  "big-tech-titans": {
    name: "Big Tech Titans",
    spendUsdc: 250,
    legs: [
      { symbol: "AAPLc", weight: 25 },
      { symbol: "MSFTc", weight: 25 },
      { symbol: "NVDAc", weight: 25 },
      { symbol: "GOOGLc", weight: 25 },
    ],
  },
  "crypto-equities": {
    name: "Digital Asset Equities",
    spendUsdc: 250,
    legs: [
      { symbol: "COINc", weight: 40 },
      { symbol: "CRCLc", weight: 30 },
      { symbol: "MSTRc", weight: 30 },
    ],
  },
  crypto: {
    name: "Digital Asset Equities",
    spendUsdc: 250,
    legs: [
      { symbol: "COINc", weight: 40 },
      { symbol: "CRCLc", weight: 30 },
      { symbol: "MSTRc", weight: 30 },
    ],
  },
  "ai-compute": {
    name: "AI & Compute Frontier",
    spendUsdc: 250,
    legs: [
      { symbol: "NVDAc", weight: 40 },
      { symbol: "MSFTc", weight: 25 },
      { symbol: "GOOGLc", weight: 20 },
      { symbol: "INTCc", weight: 15 },
    ],
  },
  aicomp: {
    name: "AI & Compute Frontier",
    spendUsdc: 250,
    legs: [
      { symbol: "NVDAc", weight: 40 },
      { symbol: "MSFTc", weight: 25 },
      { symbol: "GOOGLc", weight: 20 },
      { symbol: "INTCc", weight: 15 },
    ],
  },
  "next-gen-mobility": {
    name: "Next-Gen Tech & Mobility",
    spendUsdc: 250,
    legs: [
      { symbol: "TSLAc", weight: 35 },
      { symbol: "AMZNc", weight: 25 },
      { symbol: "METAc", weight: 25 },
      { symbol: "SPCXc", weight: 15 },
    ],
  },
  nexus: {
    name: "Next-Gen Tech & Mobility",
    spendUsdc: 250,
    legs: [
      { symbol: "TSLAc", weight: 35 },
      { symbol: "AMZNc", weight: 25 },
      { symbol: "METAc", weight: 25 },
      { symbol: "SPCXc", weight: 15 },
    ],
  },
};

/**
 * Encodes a basket to a base64url JSON string.
 */
export function encodeBasketPayload(data: {
  name: string;
  spendUsdc: string | number;
  legs: { address: string; weight: number }[];
}): string {
  const cleanName = (data.name || "Shareable Basket")
    .replace(/<[^>]*>?/gm, "")
    .trim()
    .slice(0, 40);

  const cleanSpend = Math.max(
    1,
    Math.round(Number(data.spendUsdc) || 100),
  ).toString();

  const cleanLegs = data.legs.map((leg) => ({
    a: leg.address.toLowerCase(),
    w: Math.round(leg.weight),
  }));

  const payloadObj: BasketPayload = {
    v: 1,
    name: cleanName,
    spendUsdc: cleanSpend,
    legs: cleanLegs as BasketLeg[],
  };

  const jsonStr = JSON.stringify(payloadObj);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(jsonStr, "utf-8").toString("base64url");
  }

  // Browser fallback for base64url
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decodes and rigorously validates a basket identifier (preset slug, custom slug, or base64url JSON) against official Coinbase stocks on Base.
 */
export function decodeBasketPayload(raw: string): BasketValidationResult {
  if (!raw || typeof raw !== "string" || raw.trim().length === 0) {
    return {
      isValid: false,
      error: "Empty or missing basket payload.",
      rawPayload: raw,
    };
  }

  const trimmed = raw.trim();

  // 1. Check if raw matches a known preset slug (e.g. "mag7", "big-tech", "crypto-equities", etc.)
  const presetCandidate = KNOWN_PRESET_MAP[trimmed.toLowerCase()];
  if (presetCandidate) {
    const validatedLegs: ValidatedBasketLeg[] = presetCandidate.legs.map((leg) => {
      const stock = STOCK_BY_SYMBOL[leg.symbol];
      const address = getAddress(CB_STOCKS[leg.symbol]);
      const usdcSlice = (presetCandidate.spendUsdc * leg.weight) / 100;
      return {
        stock,
        address,
        weight: leg.weight,
        usdcSlice,
      };
    });

    return {
      isValid: true,
      version: 1,
      name: presetCandidate.name,
      spendUsdc: presetCandidate.spendUsdc,
      legs: validatedLegs,
      payload: trimmed,
    };
  }

  // 2. Check if raw matches a saved custom basket slug
  const storedPayload = getCustomBasketPayload(trimmed);
  const payloadToDecode = storedPayload || trimmed;

  let jsonStr = "";
  try {
    if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(payloadToDecode, "base64url").toString("utf-8");
    } else {
      let base64 = payloadToDecode.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4 !== 0) {
        base64 += "=";
      }
      jsonStr = decodeURIComponent(escape(atob(base64)));
    }
  } catch {
    return {
      isValid: false,
      error: `Basket "${trimmed}" not found or malformed.`,
      rawPayload: raw,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      isValid: false,
      error: `Basket "${trimmed}" has invalid structure.`,
      rawPayload: raw,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      isValid: false,
      error: "This link is not valid. Invalid basket object.",
      rawPayload: raw,
    };
  }

  const obj = parsed as Record<string, unknown>;

  // 1. Validate version
  const version = typeof obj.v === "number" ? obj.v : 1;

  // 2. Validate and sanitize name (strip HTML, cap 40 chars)
  const rawName = typeof obj.name === "string" ? obj.name : "Shareable Basket";
  const cleanName =
    rawName
      .replace(/<[^>]*>?/gm, "")
      .trim()
      .slice(0, 40) || "Shareable Basket";

  // 3. Validate spend USDC
  const spendNum = Number(obj.spendUsdc);
  if (!Number.isFinite(spendNum) || spendNum <= 0) {
    return {
      isValid: false,
      error: "This link is not valid. Invalid spend USDC amount.",
      rawPayload: raw,
    };
  }
  const spendUsdc = Math.round(spendNum * 100) / 100;

  // 4. Validate legs array (2 to 10 legs)
  if (!Array.isArray(obj.legs)) {
    return {
      isValid: false,
      error: "This link is not valid. Basket legs must be an array.",
      rawPayload: raw,
    };
  }

  if (obj.legs.length < 2 || obj.legs.length > 10) {
    return {
      isValid: false,
      error: "This link is not valid. Basket must have between 2 and 10 stocks.",
      rawPayload: raw,
    };
  }

  const validatedLegs: ValidatedBasketLeg[] = [];
  const seenAddresses = new Set<string>();
  let weightSum = 0;

  for (const leg of obj.legs) {
    if (!leg || typeof leg !== "object") {
      return {
        isValid: false,
        error: "This link is not valid. One stock entry is malformed.",
        rawPayload: raw,
      };
    }
    const l = leg as Record<string, unknown>;
    const rawAddr = typeof l.a === "string" ? l.a.trim() : "";
    const rawWeight = typeof l.w === "number" ? l.w : Number(l.w);

    if (!rawAddr || !isAddress(rawAddr)) {
      return {
        isValid: false,
        error: "This link is not valid. One stock is not on the official Coinbase list.",
        rawPayload: raw,
      };
    }

    const checksummed = getAddress(rawAddr);
    const lower = checksummed.toLowerCase();

    // Check against official Coinbase B20 token allowlist
    const stockMeta = STOCK_BY_ADDRESS[lower];
    if (!stockMeta) {
      return {
        isValid: false,
        error: "This link is not valid. One stock is not on the official Coinbase list.",
        rawPayload: raw,
      };
    }

    if (seenAddresses.has(lower)) {
      return {
        isValid: false,
        error: "This link is not valid. Duplicate stocks found in basket.",
        rawPayload: raw,
      };
    }
    seenAddresses.add(lower);

    // Weight must be a positive integer
    if (!Number.isInteger(rawWeight) || rawWeight <= 0) {
      return {
        isValid: false,
        error: "This link is not valid. Stock weights must be positive integers.",
        rawPayload: raw,
      };
    }

    weightSum += rawWeight;
    const usdcSlice = (spendUsdc * rawWeight) / 100;

    validatedLegs.push({
      stock: stockMeta,
      address: checksummed,
      weight: rawWeight,
      usdcSlice,
    });
  }

  // Weights must sum to exactly 100
  if (weightSum !== 100) {
    return {
      isValid: false,
      error: `This link is not valid. Stock weights sum to ${weightSum}%, but must sum to exactly 100%.`,
      rawPayload: raw,
    };
  }

  return {
    isValid: true,
    version,
    name: cleanName,
    spendUsdc,
    legs: validatedLegs,
    payload: raw,
  };
}

/**
 * Server function to securely decode and validate a basket payload with US geo-blocking.
 */
export const fetchValidatedBasket = createServerFn({ method: "POST" })
  .validator((d: { payload: string }) => d)
  .handler(async ({ data }): Promise<BasketValidationResult> => {
    // 1. Enforce US geo restriction
    try {
      const { assertServerGeoNotUs } = await import("./geo.server");
      assertServerGeoNotUs();
    } catch {
      return {
        isValid: false,
        error: "Access denied: Basket operations are restricted in your jurisdiction (US/sanctioned).",
        rawPayload: data.payload,
      };
    }

    // 2. Decode and validate
    return decodeBasketPayload(data.payload);
  });


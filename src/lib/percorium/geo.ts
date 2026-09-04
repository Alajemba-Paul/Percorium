import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { RESTRICTED_COUNTRIES } from "./constants";
import type { Eligibility } from "./types";

function normalizeCountry(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (!v || v === "XX" || v === "T1" || v === "ZZ") return null;
  return v.slice(0, 2);
}

export const fetchEligibility = createServerFn({ method: "GET" }).handler(
  async (): Promise<Eligibility> => {
    const header =
      getRequestHeader("cf-ipcountry") ||
      getRequestHeader("x-vercel-ip-country") ||
      getRequestHeader("x-country") ||
      getRequestHeader("cloudfront-viewer-country");
    const country = normalizeCountry(header);
    if (!country) {
      return { country: null, restricted: false, source: "unknown" };
    }
    return {
      country,
      restricted: RESTRICTED_COUNTRIES.has(country),
      source: "header",
    };
  },
);

import { getRequestHeader } from "@tanstack/react-start/server";
import { assertNotUs } from "./security";

function normalizeCountry(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (!v || v === "XX" || v === "T1" || v === "ZZ") return null;
  return v.slice(0, 2);
}

/**
 * Extracts trusted edge-provider IP country headers.
 * Ignores client-controllable headers (like x-country, x-forwarded-for).
 */
export function getEdgeCountry(): string | null {
  const vercel = getRequestHeader("x-vercel-ip-country");
  const cf = getRequestHeader("cf-ipcountry");
  const cloudfront = getRequestHeader("cloudfront-viewer-country");
  return (
    normalizeCountry(vercel) ||
    normalizeCountry(cf) ||
    normalizeCountry(cloudfront)
  );
}

/**
 * Server-side geo guard that throws immediately if requester is from a restricted jurisdiction (US/sanctions).
 */
export function assertServerGeoNotUs(): void {
  const vercel = getRequestHeader("x-vercel-ip-country");
  const cf = getRequestHeader("cf-ipcountry");
  const cloudfront = getRequestHeader("cloudfront-viewer-country");
  assertNotUs({
    vercelCountry: vercel,
    cfCountry: cf,
    cloudFrontCountry: cloudfront,
  });
}

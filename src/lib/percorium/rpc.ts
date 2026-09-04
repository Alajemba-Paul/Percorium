import { createPublicClient, fallback, http } from "viem";
import { base } from "viem/chains";
import { BASE_RPC_FALLBACKS } from "./constants";

export function rpcUrl(): string {
  return (
    (typeof process !== "undefined" && process.env.BASE_RPC) ||
    BASE_RPC_FALLBACKS[0]
  );
}

export function getPublicClient() {
  const urls = [
    typeof process !== "undefined" ? process.env.BASE_RPC : undefined,
    ...BASE_RPC_FALLBACKS,
  ].filter((u): u is string => Boolean(u));
  const unique = [...new Set(urls)];
  return createPublicClient({
    chain: base,
    transport: fallback(unique.map((u) => http(u, { timeout: 12_000 }))),
  });
}

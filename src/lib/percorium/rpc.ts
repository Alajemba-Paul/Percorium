import { createPublicClient, fallback, http } from "viem";
import { base } from "viem/chains";
import { BASE_RPC_FALLBACKS } from "./constants";

export function rpcUrl(): string {
  // Never leak process.env.BASE_RPC (which may contain private API keys) to the client
  return BASE_RPC_FALLBACKS[0];
}

export function safeRpcDisplay(): string {
  return "Base Mainnet (8453)";
}


export function getPublicClient() {
  const urls = [
    typeof process !== "undefined" ? process.env.BASE_RPC : undefined,
    ...BASE_RPC_FALLBACKS,
  ].filter((u): u is string => Boolean(u));
  const unique = [...new Set(urls)];
  return createPublicClient({
    chain: base,
    transport: fallback(
      unique.map((u) => http(u, { timeout: 10_000, retryCount: 2 })),
      {
        shouldThrow(error) {
          // If a method is not found on one RPC provider, don't abort immediately; fall through to the next
          if ("code" in error && (error.code === -32601 || error.code === -32600)) {
            return false;
          }
          return false;
        },
      },
    ),
  });
}

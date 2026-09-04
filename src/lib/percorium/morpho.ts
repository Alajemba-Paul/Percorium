import { createServerFn } from "@tanstack/react-start";
import { STOCKS, USDC } from "./constants";
import type { MorphoMarketView } from "./types";

const QUERY = `
  query Markets($whitelisted: [String!]!, $usdc: String!) {
    markets(
      first: 50
      where: {
        chainId_in: [8453]
        collateralAssetAddress_in: $whitelisted
        loanAssetAddress_in: [$usdc]
      }
    ) {
      items {
        uniqueKey
        lltv
        collateralAsset { address }
        loanAsset { address }
        oracle { address }
        irm { address }
        state {
          supplyApy
          borrowApy
          liquidityAssetsUsd
        }
      }
    }
  }
`;

export const fetchMorphoMarkets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ markets: MorphoMarketView[]; error?: string }> => {
    try {
      const res = await fetch("https://api.morpho.org/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            whitelisted: STOCKS.map((s) => s.address.toLowerCase()),
            usdc: USDC.toLowerCase(),
          },
        }),
      });
      if (!res.ok) {
        return { markets: [], error: `Morpho API ${res.status}` };
      }
      const json = (await res.json()) as {
        data?: {
          markets?: {
            items?: {
              uniqueKey: string;
              lltv: string | number;
              collateralAsset?: { address: string };
              loanAsset?: { address: string };
              oracle?: { address: string };
              irm?: { address: string };
              state?: {
                supplyApy?: number;
                borrowApy?: number;
                liquidityAssetsUsd?: number;
              };
            }[];
          };
        };
        errors?: { message: string }[];
      };
      if (json.errors?.length) {
        return { markets: [], error: json.errors[0]?.message };
      }
      const items = json.data?.markets?.items ?? [];
      const markets: MorphoMarketView[] = items
        .filter((m) => m.collateralAsset?.address && m.loanAsset?.address)
        .map((m) => ({
          uniqueKey: m.uniqueKey,
          collateral: m.collateralAsset!.address as `0x${string}`,
          loan: m.loanAsset!.address as `0x${string}`,
          lltv: Number(m.lltv) / 1e18,
          supplyApy: Number(m.state?.supplyApy ?? 0),
          borrowApy: Number(m.state?.borrowApy ?? 0),
          liquidity: Number(m.state?.liquidityAssetsUsd ?? 0),
          oracle: m.oracle?.address as `0x${string}` | undefined,
          irm: m.irm?.address as `0x${string}` | undefined,
        }));
      return { markets };
    } catch (err) {
      return {
        markets: [],
        error: err instanceof Error ? err.message : "Morpho lookup failed",
      };
    }
  },
);

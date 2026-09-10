import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { ERC20_ABI } from "@/lib/percorium/abis";
import {
  B20_DECIMALS,
  STOCKS,
  USDC,
  USDC_DECIMALS,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { getPublicClient } from "@/lib/percorium/rpc";

export type TokenHolding = {
  raw: string;
  units: number;
};

export type StockBalances = {
  usdc: TokenHolding;
  stocks: Record<StockSymbol, TokenHolding>;
  effectiveUsdc: number;
  effectiveStock: (symbol: StockSymbol) => number;
  hasAnyStock: boolean;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
};

const B20_SCALE = 10 ** B20_DECIMALS;
const USDC_SCALE = 10 ** USDC_DECIMALS;

function emptyStocks(): Record<StockSymbol, TokenHolding> {
  const stocks = {} as Record<StockSymbol, TokenHolding>;
  for (const s of STOCKS) {
    stocks[s.symbol as StockSymbol] = { raw: "0", units: 0 };
  }
  return stocks;
}

export function useStockBalances(customAddress?: `0x${string}`): StockBalances {
  const { address: connectedAddress } = useAccount();
  const address = customAddress ?? connectedAddress;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["stock-balances", address?.toLowerCase()],
    queryFn: async () => {
      if (!address) {
        return {
          usdc: { raw: "0", units: 0 },
          stocks: emptyStocks(),
        };
      }

      const client = getPublicClient();

      const contracts = [
        {
          address: USDC as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [address],
        },
        ...STOCKS.map((s) => ({
          address: s.address,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [address],
        })),
      ];

      const results = await client.multicall({
        contracts,
        allowFailure: true,
      });

      const usdcRes = results[0];
      const usdcRaw =
        usdcRes.status === "success" && typeof usdcRes.result === "bigint"
          ? usdcRes.result
          : 0n;

      const stocks = {} as Record<StockSymbol, TokenHolding>;
      STOCKS.forEach((s, idx) => {
        const res = results[idx + 1];
        const raw =
          res.status === "success" && typeof res.result === "bigint"
            ? res.result
            : 0n;
        stocks[s.symbol as StockSymbol] = {
          raw: raw.toString(),
          units: Number(raw) / B20_SCALE,
        };
      });

      return {
        usdc: { raw: usdcRaw.toString(), units: Number(usdcRaw) / USDC_SCALE },
        stocks,
      };
    },
    enabled: true,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const usdcHolding = data?.usdc ?? { raw: "0", units: 0 };
  const stocksHolding = data?.stocks ?? emptyStocks();

  const effectiveUsdc = usdcHolding.units;

  const effectiveStock = (sym: StockSymbol): number => {
    return stocksHolding[sym]?.units ?? 0;
  };

  const hasAnyStock = Object.values(stocksHolding).some(
    (h) => h.units > 0 || (h.raw !== "0" && h.raw !== ""),
  );

  return {
    usdc: usdcHolding,
    stocks: stocksHolding,
    effectiveUsdc,
    effectiveStock,
    hasAnyStock,
    isLoading,
    isFetching,
    refetch,
  };
}

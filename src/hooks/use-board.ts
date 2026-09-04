import { useQuery } from "@tanstack/react-query";
import { fetchEligibility } from "@/lib/percorium/geo";
import { fetchMorphoMarkets } from "@/lib/percorium/morpho";
import { fetchPriceBoard } from "@/lib/percorium/prices";
import {
  fetchOfficialUsdcBoard,
  fetchOfficialUsdcPair,
} from "@/lib/dexscreener";
import { useDemoStore } from "@/lib/percorium/demo-store";
import type { StockSymbol } from "@/lib/percorium/constants";
import type { StockQuote } from "@/lib/percorium/types";

export function usePriceBoard() {
  return useQuery({
    queryKey: ["price-board"],
    queryFn: () => fetchPriceBoard(),
    refetchInterval: 30_000,
  });
}

export function useDexPair(token: string | undefined) {
  return useQuery({
    queryKey: ["dex-pair", token?.toLowerCase()],
    queryFn: () => fetchOfficialUsdcPair({ data: { token: token! } }),
    enabled: Boolean(token),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useDexBoard() {
  return useQuery({
    queryKey: ["dex-board"],
    queryFn: () => fetchOfficialUsdcBoard(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useEligibility() {
  const { jurisdiction, acknowledgedNonUs } = useDemoStore();
  const q = useQuery({
    queryKey: ["eligibility"],
    queryFn: () => fetchEligibility(),
  });
  const geoRestricted = q.data?.restricted ?? false;
  const country = q.data?.country ?? null;
  const restricted =
    jurisdiction === "us"
      ? true
      : jurisdiction === "eligible"
        ? false
        : geoRestricted
          ? true
          : country === null
            ? !acknowledgedNonUs
            : false;
  return {
    ...q,
    country,
    geoRestricted,
    restricted,
    needsAck: jurisdiction === "auto" && country === null && !acknowledgedNonUs,
    source: q.data?.source ?? "unknown",
  };
}

export function useMorpho() {
  return useQuery({
    queryKey: ["morpho-markets"],
    queryFn: () => fetchMorphoMarkets(),
    staleTime: 60_000,
  });
}

export function quoteMap(quotes: StockQuote[] | undefined) {
  const map = {} as Record<StockSymbol, StockQuote>;
  for (const q of quotes ?? []) map[q.symbol] = q;
  return map;
}

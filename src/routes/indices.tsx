import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StockMark } from "@/components/stock-mark";
import { listSlabs, type IndexSlab } from "@/lib/percorium/indices";
import { indexNav, normalizeWeights } from "@/lib/percorium/nav";
import { formatUsd } from "@/lib/percorium/format";
import { usePriceBoard, quoteMap } from "@/hooks/use-board";
import type { StockSymbol } from "@/lib/percorium/constants";

export const Route = createFileRoute("/indices")({ component: IndicesPage });

function IndicesPage() {
  const [slabs, setSlabs] = useState<IndexSlab[]>([]);
  const board = usePriceBoard();
  const quotes = quoteMap(board.data?.stocks);

  useEffect(() => {
    setSlabs(listSlabs());
  }, []);

  const prices = Object.fromEntries(
    Object.entries(quotes).map(([k, v]) => [k, v.oracle]),
  ) as Partial<Record<StockSymbol, number>>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Index workshop</h1>
          <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
            Isolated ERC-4626 slabs. Each basket is official Coinbase B20
            inventory plus residual USDC. Launch NAV is 1.00 USDC. One slab
            cannot contagion another.
          </p>
        </div>
        <Button asChild>
          <Link to="/indices/create">New index</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {slabs.map((slab) => {
          const nav = indexNav({
            inventory: slab.inventory,
            prices,
            cashUsdc: slab.cashUsdc,
            supply: slab.supply,
          });
          const weights = normalizeWeights(slab.weights);
          return (
            <Link
              key={slab.id}
              to="/indices/$id"
              params={{ id: slab.id }}
              className="rounded-xl bg-card p-5 shadow-border transition-[box-shadow] duration-150 hover:shadow-border-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {slab.symbol}
                  </div>
                  <h2 className="font-display text-2xl">{slab.name}</h2>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums">{formatUsd(nav)}</div>
                  <div className="text-xs text-muted-foreground">NAV</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(weights) as StockSymbol[]).map((sym) => (
                  <span
                    key={sym}
                    className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2 py-1 text-xs"
                  >
                    <StockMark symbol={sym} size="sm" />
                    {Math.round(weights[sym] * 100)}%
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Supply {slab.supply.toFixed(2)} · workshop slab
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

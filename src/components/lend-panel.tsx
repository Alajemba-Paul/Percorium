import { Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StockSymbol } from "@/lib/percorium/constants";
import { STOCK_BY_SYMBOL, DEFAULT_INDEX_LTV_BPS } from "@/lib/percorium/constants";
import { formatPct, formatUsd } from "@/lib/percorium/format";
import { healthFactor, liquidationPriceUsdc } from "@/lib/percorium/nav";
import { useEligibility, useMorpho, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { useMemo, useState } from "react";

export function LendPanel({
  symbol,
  assetAddress,
  isIndex,
  nav,
  shares,
}: {
  symbol: string;
  assetAddress: string;
  isIndex?: boolean;
  nav?: number;
  shares?: number;
}) {
  const morpho = useMorpho();
  const board = usePriceBoard();
  const { restricted } = useEligibility();
  const [collat, setCollat] = useState("1");
  const [debt, setDebt] = useState("10");
  const quotes = quoteMap(board.data?.stocks);
  const market = (morpho.data?.markets ?? []).find(
    (m) => m.collateral.toLowerCase() === assetAddress.toLowerCase(),
  );
  const px = !isIndex
    ? quotes[symbol as StockSymbol]?.oracle ?? 0
    : (nav ?? 1);
  const sequencerDown = board.data ? !board.data.sequencer.up : true;
  const feed = !isIndex ? quotes[symbol as StockSymbol] : undefined;
  const feedBad = feed
    ? feed.status === "paused" || feed.status === "stale"
    : false;
  const locked = restricted || sequencerDown || feedBad;

  const sim = useMemo(() => {
    const c = Number(collat) || 0;
    const d = Number(debt) || 0;
    const hf = healthFactor({
      nav: px,
      shares: c,
      debtUsdc: d,
      ltvBps: market ? Math.round(market.lltv * 10_000) : DEFAULT_INDEX_LTV_BPS,
    });
    const liq = liquidationPriceUsdc({
      nav: px,
      shares: c,
      debtUsdc: d,
      ltvBps: market ? Math.round(market.lltv * 10_000) : DEFAULT_INDEX_LTV_BPS,
    });
    return { hf, liq };
  }, [collat, debt, px, market]);

  return (
    <div className="rounded-xl bg-card p-5 shadow-border">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <h2 className="font-display text-xl">Credit</h2>
        </div>
        {market ? (
          <Badge variant="live">Morpho market</Badge>
        ) : (
          <Badge variant="outline">No market yet</Badge>
        )}
      </div>

      {market ? (
        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <Stat k="Supply APY" v={formatPct(market.supplyApy)} />
          <Stat k="Borrow APY" v={formatPct(market.borrowApy)} />
          <Stat k="LLTV" v={formatPct(market.lltv, 0)} />
          <Stat k="Liquidity" v={formatUsd(market.liquidity, 0)} />
        </dl>
      ) : (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          No isolated Morpho Blue market for{" "}
          {isIndex ? symbol : STOCK_BY_SYMBOL[symbol as StockSymbol]?.company}{" "}
          as collateral yet. Spot, index inclusion, and holders chat still work.
          Isolated borrow vs this asset is hidden until a market exists.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Collateral ({symbol})</Label>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            value={collat}
            onChange={(e) => setCollat(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div>
          <Label>Borrow USDC</Label>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            value={debt}
            onChange={(e) => setDebt(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
      </div>

      <dl className="mt-4 space-y-2 rounded-lg bg-elevated p-3 text-sm">
        <Stat
          k="Health factor"
          v={Number.isFinite(sim.hf) ? sim.hf.toFixed(2) : "∞"}
        />
        <Stat k="Liq. NAV / price" v={formatUsd(sim.liq)} />
        <Stat
          k="Max LTV"
          v={formatPct(
            market ? market.lltv : DEFAULT_INDEX_LTV_BPS / 10_000,
            0,
          )}
        />
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={!market || locked}>
          Supply
        </Button>
        <Button disabled={!market || locked}>Borrow USDC</Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Isolated only. No protocol-wide cross-margin. No house-backed perps.
        {locked ? " Ticket is fail-closed until eligibility, sequencer, and feed clear." : ""}
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono tabular-nums">{v}</dd>
    </div>
  );
}

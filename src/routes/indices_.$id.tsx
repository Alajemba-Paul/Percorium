import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoldersChat } from "@/components/holders-chat";
import { IndexNavCard } from "@/components/StockChart";
import { LendPanel } from "@/components/lend-panel";
import { StockMark } from "@/components/stock-mark";
import { getSlab, mintSlab, redeemSlab } from "@/lib/percorium/indices";
import {
  allocateUsdcToBasket,
  applyProtocolFee,
  indexNav,
  normalizeWeights,
  sharesFromMint,
} from "@/lib/percorium/nav";
import { formatNum, formatUsd } from "@/lib/percorium/format";
import type { StockSymbol } from "@/lib/percorium/constants";
import { useEligibility, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { STOCK_BY_SYMBOL } from "@/lib/percorium/constants";

export const Route = createFileRoute("/indices_/$id")({
  component: IndexPage,
});

function IndexPage() {
  const { id } = Route.useParams();
  const [rev, setRev] = useState(0);
  const [usdc, setUsdc] = useState("1000");
  const [shares, setShares] = useState("10");
  const [asUsdc, setAsUsdc] = useState(true);
  const found = useMemo(() => {
    void rev;
    return getSlab(id);
  }, [id, rev]);
  const board = usePriceBoard();
  const { restricted } = useEligibility();
  const quotes = quoteMap(board.data?.stocks);
  const prices = Object.fromEntries(
    Object.entries(quotes).map(([k, v]) => [k, v.oracle]),
  ) as Partial<Record<StockSymbol, number>>;

  if (!found) throw notFound();
  const slab = found;

  const nav = indexNav({
    inventory: slab.inventory,
    prices,
    cashUsdc: slab.cashUsdc,
    supply: slab.supply,
  });
  const weights = normalizeWeights(slab.weights);
  const gross = Number(usdc) || 0;
  const { fee, net } = applyProtocolFee(gross, slab.feeBps);
  const mintShares = sharesFromMint(net, nav);
  const fills = allocateUsdcToBasket(net, slab.weights, prices);
  const feedBad = fills.some((f) => {
    const st = quotes[f.symbol]?.status;
    return st === "paused" || st === "stale";
  });
  const sequencerDown = board.data ? !board.data.sequencer.up : true;
  const locked = restricted || sequencerDown || feedBad;

  function mint() {
    if (locked) {
      toast.error("Minting is blocked.");
      return;
    }
    mintSlab(slab.id, gross, prices);
    setRev((n) => n + 1);
    toast.success(`Minted ${mintShares.toFixed(4)} ${slab.symbol}`);
  }

  function redeem() {
    if (locked) {
      toast.error("Redemption is blocked.");
      return;
    }
    redeemSlab(slab.id, Number(shares) || 0, asUsdc, prices);
    setRev((n) => n + 1);
    toast.success("Redeemed shares");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Stock Basket
          </p>
          <h1 className="font-display text-4xl tracking-tight">{slab.name}</h1>
          <p className="text-muted-foreground">
            {slab.symbol} · Creator: {slab.creator}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-display text-4xl tabular-nums">{formatUsd(nav)}</div>
          <div className="text-xs text-muted-foreground">Basket value · Starts at 1.00 USDC</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat k="Total Supply" v={formatNum(slab.supply, 4)} />
        <Stat k="Fee" v={`${slab.feeBps / 100}%`} />
        <Stat k="Max Loan" v={`${slab.maxLtvBps / 100}%`} />
      </div>

      <IndexNavCard />

      <section className="rounded-xl bg-card p-5 shadow-border">
        <h2 className="font-display text-xl">Stock Weights</h2>
        <ul className="mt-4 space-y-3">
          {(Object.keys(weights) as StockSymbol[]).map((sym) => {
            const meta = STOCK_BY_SYMBOL[sym];
            const held = slab.inventory[sym] ?? 0;
            return (
              <li
                key={sym}
                className="flex items-center justify-between gap-3 rounded-lg bg-elevated px-3 py-2"
              >
                <Link
                  to="/stocks/$symbol"
                  params={{ symbol: sym }}
                  className="flex items-center gap-2"
                >
                  <StockMark symbol={sym} size="sm" />
                  <span>
                    {sym}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {meta.company}
                    </span>
                  </span>
                </Link>
                <span className="font-mono text-sm tabular-nums">
                  {Math.round(weights[sym] * 100)}% · {held.toFixed(4)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-border">
          <h2 className="font-display text-xl">Deposit USDC</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buys the underlying stocks and mints basket shares.
          </p>
          <Label className="mt-4 block">USDC</Label>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            value={usdc}
            onChange={(e) => setUsdc(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          <ul className="mt-4 space-y-1.5 text-sm">
            {fills.map((f) => (
              <li key={f.symbol} className="flex justify-between font-mono tabular-nums">
                <span>{f.symbol}</span>
                <span>
                  {formatUsd(f.usdc)} → {f.units.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Fee {formatUsd(fee)} · Estimated shares {mintShares.toFixed(4)}
          </p>
          <Button className="mt-4 w-full" disabled={locked} onClick={mint}>
            Deposit &amp; Mint
          </Button>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-border">
          <h2 className="font-display text-xl">Redeem Shares</h2>
          <Label className="mt-4 block">Shares</Label>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            value={shares}
            onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          <Tabs
            className="mt-4"
            value={asUsdc ? "usdc" : "basket"}
            onValueChange={(v) => setAsUsdc(v === "usdc")}
          >
            <TabsList className="w-full">
              <TabsTrigger value="usdc">Receive USDC</TabsTrigger>
              <TabsTrigger value="basket">Receive Stocks</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={locked}
            onClick={redeem}
          >
            Redeem Shares
          </Button>
        </div>
      </div>

      <LendPanel
        symbol={slab.symbol}
        assetAddress={"0x0000000000000000000000000000000000000000"}
        isIndex
        nav={nav}
        shares={slab.supply}
      />

      <HoldersChat
        room={`index:${slab.id}`}
        asset="index"
        label={`${slab.symbol} holders`}
      />
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-border">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {k}
      </div>
      <div className="mt-1 font-mono tabular-nums">{v}</div>
    </div>
  );
}

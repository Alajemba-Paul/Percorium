import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BasisDot, ChangeSpark } from "@/components/StockChart";
import { StockMark } from "@/components/stock-mark";
import { basisView } from "@/lib/basis";
import type { DexPairView } from "@/lib/dexscreener";
import { STOCKS, COMPLIANCE_COPY, type StockSymbol } from "@/lib/percorium/constants";
import {
  formatRelative,
  formatSignedPct,
  formatUsd,
  isUsEquitySession,
} from "@/lib/percorium/format";
import { useDemoStore } from "@/lib/percorium/demo-store";
import { useDexBoard, useMorpho, usePriceBoard, quoteMap } from "@/hooks/use-board";
import type { FeedStatus, StockQuote } from "@/lib/percorium/types";

export const Route = createFileRoute("/")({ component: Discover });

function statusBadge(status: FeedStatus) {
  if (status === "live") return <Badge variant="live">Live</Badge>;
  if (status === "holding") return <Badge variant="warn">Last close</Badge>;
  if (status === "stale") return <Badge variant="warn">Stale</Badge>;
  return <Badge variant="danger">Paused</Badge>;
}

function Discover() {
  const board = usePriceBoard();
  const dex = useDexBoard();
  const morpho = useMorpho();
  const quotes = quoteMap(board.data?.stocks);
  const session = isUsEquitySession();
  const { jurisdiction, setJurisdiction } = useDemoStore();
  const sequencer = board.data?.sequencer;

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Coinbase Tokenized Stocks · Base 8453
          </p>
          <h1 className="max-w-xl font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            Onchain brokerage for real Coinbase shares.
          </h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Percorium routes official B20 addresses only. Buy and swap through
            0x, compose fully backed index slabs, put names to work in Morpho
            when a market exists, and talk only with other holders.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/stocks/$symbol" params={{ symbol: "NVDAc" }}>
                Trade NVDAc
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/indices/create">Compose an index</Link>
            </Button>
          </div>
        </div>
        <aside className="grid grid-cols-2 gap-3 rounded-xl bg-card p-4 shadow-border">
          <Metric
            k="Sequencer"
            v={
              sequencer?.up
                ? sequencer.grace
                  ? "Grace"
                  : "Up"
                : board.isLoading
                  ? "…"
                  : "Down"
            }
          />
          <Metric k="Cash session" v={session.label} />
          <Metric k="Names" v={String(STOCKS.length)} />
          <Metric
            k="Morpho"
            v={
              morpho.data
                ? `${morpho.data.markets.length} markets`
                : morpho.isLoading
                  ? "…"
                  : "None"
            }
          />
        </aside>
      </section>

      {board.error || board.data?.error ? (
        <p className="text-sm text-destructive">
          Oracle read failed: {board.data?.error ?? String(board.error)}
        </p>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Discover</h2>
            <p className="text-sm text-muted-foreground">
              Chainlink total-return price is the risk price. AMM is basis only.
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
            <Radio className="size-3.5" />
            30s refresh
          </span>
        </div>

        <div className="hidden overflow-hidden rounded-xl bg-card shadow-border md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Oracle</th>
                <th className="px-4 py-3 font-medium">24h</th>
                <th className="px-4 py-3 font-medium">Feed</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Credit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {STOCKS.map((s) => {
                const q = quotes[s.symbol];
                const pair = dex.data?.[s.address.toLowerCase()] ?? null;
                const mkt = (morpho.data?.markets ?? []).find(
                  (m) => m.collateral.toLowerCase() === s.address.toLowerCase(),
                );
                return (
                  <tr
                    key={s.symbol}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StockMark symbol={s.symbol} size="sm" />
                        <div>
                          <div className="font-medium">{s.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.company}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <OracleCell
                        loading={board.isLoading}
                        quote={q}
                        pair={pair}
                        sequencerUp={sequencer?.up}
                        grace={sequencer?.grace}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ChangeCell loading={dex.isLoading} pair={pair} />
                    </td>
                    <td className="px-4 py-3">
                      {q ? statusBadge(q.status) : <Skeleton className="h-5 w-14" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {q?.updatedAt ? formatRelative(q.updatedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {mkt ? "Morpho" : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          to="/stocks/$symbol"
                          params={{ symbol: s.symbol as StockSymbol }}
                        >
                          Chart
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:hidden">
          {STOCKS.map((s) => {
            const q = quotes[s.symbol];
            const pair = dex.data?.[s.address.toLowerCase()] ?? null;
            const basis = basisView({
              ammUsd: pair?.priceUsd,
              chainlinkUsd: q?.oracle ?? 0,
              feedStatus: q?.status,
              sequencer: board.data?.sequencer,
            });
            return (
              <Link
                key={s.symbol}
                to="/stocks/$symbol"
                params={{ symbol: s.symbol }}
                className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-border"
              >
                <div className="flex items-center gap-3">
                  <StockMark symbol={s.symbol} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.symbol}</span>
                      <BasisDot tone={basis.tone} title={basis.label} />
                    </div>
                    <div className="text-xs text-muted-foreground">{s.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums text-sm">
                    {formatUsd(q?.oracle ?? 0)}
                  </div>
                  <ChangeCell loading={dex.isLoading} pair={pair} compact />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-border">
        <h2 className="font-display text-xl">Demo gate</h2>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
          {COMPLIANCE_COPY} Use this switch for the Loom: eligible vs restricted.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["auto", "Auto"],
              ["eligible", "Eligible (non-US)"],
              ["us", "Restricted (US)"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              size="sm"
              variant={jurisdiction === mode ? "default" : "outline"}
              onClick={() => setJurisdiction(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function OracleCell({
  loading,
  quote,
  pair,
  sequencerUp,
  grace,
}: {
  loading: boolean;
  quote?: StockQuote;
  pair: DexPairView | null;
  sequencerUp?: boolean;
  grace?: boolean;
}) {
  if (loading) return <Skeleton className="h-4 w-16" />;
  const basis = basisView({
    ammUsd: pair?.priceUsd,
    chainlinkUsd: quote?.oracle ?? 0,
    feedStatus: quote?.status,
    sequencer:
      sequencerUp == null
        ? null
        : { up: sequencerUp, startedAt: 0, grace: grace ?? false },
  });
  return (
    <div className="flex items-center gap-2 font-mono tabular-nums">
      {formatUsd(quote?.oracle ?? 0)}
      <BasisDot tone={basis.tone} title={basis.label} />
    </div>
  );
}

function ChangeCell({
  loading,
  pair,
  compact,
}: {
  loading: boolean;
  pair: DexPairView | null;
  compact?: boolean;
}) {
  if (loading) return <Skeleton className="h-4 w-16" />;
  if (!pair) return <span className="text-muted-foreground">—</span>;
  const chg = pair.priceChange.h24;
  return (
    <div className="flex items-center justify-end gap-2 md:justify-start">
      {compact ? null : <ChangeSpark chg={pair.priceChange} />}
      <span
        className={
          chg == null
            ? "text-muted-foreground"
            : chg >= 0
              ? "font-mono text-xs tabular-nums text-success"
              : "font-mono text-xs tabular-nums text-destructive"
        }
      >
        {chg == null ? "—" : formatSignedPct(chg)}
      </span>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-elevated p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {k}
      </div>
      <div className="mt-1 font-mono text-sm tabular-nums">{v}</div>
    </div>
  );
}

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { HoldersChat } from "@/components/holders-chat";
import { LendPanel } from "@/components/lend-panel";
import { OfficialPriceBadge } from "@/components/official-price-badge";
import { StockChart } from "@/components/StockChart";
import { StockMark } from "@/components/stock-mark";
import { TradeTicket } from "@/components/trade-ticket";
import {
  STOCK_BY_SYMBOL,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { formatUsd, shortAddress } from "@/lib/percorium/format";
import { usePriceBoard, quoteMap } from "@/hooks/use-board";

export const Route = createFileRoute("/stocks_/$symbol")({
  component: StockPage,
});

function StockPage() {
  const { symbol } = Route.useParams();
  const board = usePriceBoard();
  const stock = STOCK_BY_SYMBOL[symbol as StockSymbol];
  const q = stock ? quoteMap(board.data?.stocks)[stock.symbol] : undefined;
  if (!stock) throw notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <StockMark symbol={stock.symbol} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {stock.sector}
            </p>
            <h1 className="font-display text-4xl tracking-tight">{stock.symbol}</h1>
            <p className="text-muted-foreground">{stock.company}</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-display text-4xl tabular-nums tracking-tight">
            {formatUsd(q?.oracle ?? 0)}
          </div>
          <div className="mt-1 flex flex-col items-start sm:items-end">
            <OfficialPriceBadge updatedAt={q?.updatedAt} />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta
          k="Token"
          v={
            <a
              className="font-mono text-xs underline-offset-2 hover:underline"
              href={`https://basescan.org/address/${stock.address}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddress(stock.address, 5)}
              <ExternalLink className="ml-1 inline size-3" />
            </a>
          }
        />
        <Meta
          k="Price Feed"
          v={
            <span className="font-mono text-xs">
              {shortAddress(stock.feed, 4)}
            </span>
          }
        />
        <Meta
          k="Multiplier"
          v={
            <span className="font-mono tabular-nums">
              {q?.multiplier ? q.multiplier.toFixed(6) : "—"}
            </span>
          }
        />
        <Meta k="Underlying" v={stock.underlying} />
      </dl>

      <StockChart tokenAddress={stock.address} symbol={stock.symbol} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <TradeTicket symbol={stock.symbol} quote={q} />
        <LendPanel symbol={stock.symbol} assetAddress={stock.address} />
      </div>

      <HoldersChat
        room={stock.symbol}
        asset={stock.address}
        label={`${stock.symbol} holders`}
      />

      <p className="text-xs text-muted-foreground">
        Identify this stock by contract address {stock.address}, not by ticker alone.{" "}
        <Link to="/" className="underline-offset-2 hover:underline">
          Back to discover
        </Link>
      </p>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-border">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {k}
      </dt>
      <dd className="mt-1 text-sm">{v}</dd>
    </div>
  );
}

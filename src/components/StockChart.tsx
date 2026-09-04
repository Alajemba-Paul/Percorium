import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { basisView, type BasisTone } from "@/lib/basis";
import type { DexPriceChange } from "@/lib/dexscreener";
import { STOCK_BY_ADDRESS } from "@/lib/percorium/constants";
import {
  formatCompactUsd,
  formatSignedPct,
  formatUsd,
} from "@/lib/percorium/format";
import { useHydrated } from "@/hooks/use-hydrated";
import { useDexPair, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { cn } from "@/lib/utils";

const TF_KEY = "percorium.chart.tf";
const CHART_CAPTION =
  "Onchain price is the Aerodrome/DEX mid. Chainlink is the 24/5 official reference used for NAV and LTV. Weekend prints can gap.";

export const TIMEFRAMES = [
  { id: "5m", gecko: "5m", dex: "5", label: "5m" },
  { id: "15m", gecko: "15m", dex: "15", label: "15m" },
  { id: "1H", gecko: "1h", dex: "60", label: "1H" },
  { id: "4H", gecko: "4h", dex: "240", label: "4H" },
  { id: "1D", gecko: "1d", dex: "1D", label: "1D" },
  { id: "1W", gecko: "1w", dex: "1W", label: "1W" },
] as const;

export type ChartTimeframe = (typeof TIMEFRAMES)[number]["id"];
export type ChartSource = "dexscreener" | "geckoterminal";

function isTimeframe(v: string | null): v is ChartTimeframe {
  return TIMEFRAMES.some((t) => t.id === v);
}

function readStoredTf(): ChartTimeframe {
  if (typeof window === "undefined") return "1H";
  const raw = window.localStorage.getItem(TF_KEY);
  return isTimeframe(raw) ? raw : "1H";
}

function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function dexEmbedSrc(pairAddress: string, interval: string) {
  const pair = pairAddress.toLowerCase();
  return `https://dexscreener.com/base/${pair}?embed=1&theme=dark&info=0&trades=0&interval=${encodeURIComponent(interval)}`;
}

function geckoEmbedSrc(pairAddress: string, resolution: string) {
  const pair = pairAddress.toLowerCase();
  return `https://www.geckoterminal.com/base/pools/${pair}?embed=1&info=0&swaps=0&light_chart=0&resolution=${encodeURIComponent(resolution)}`;
}

const TONE_CLASS: Record<BasisTone, string> = {
  premium: "bg-success/15 text-success",
  discount: "bg-destructive/15 text-destructive",
  paused: "bg-elevated text-muted-foreground",
  flat: "bg-elevated text-muted-foreground",
};

export function BasisChip({
  tone,
  label,
}: {
  tone: BasisTone;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASS[tone],
      )}
    >
      {label}
    </span>
  );
}

export function BasisDot({
  tone,
  title,
}: {
  tone: BasisTone;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "premium" && "bg-success",
        tone === "discount" && "bg-destructive",
        (tone === "paused" || tone === "flat") && "bg-muted-foreground/50",
      )}
    />
  );
}

export function ChangeSpark({
  chg,
  className,
}: {
  chg?: DexPriceChange;
  className?: string;
}) {
  const vals = [chg?.m5 ?? 0, chg?.h1 ?? 0, chg?.h6 ?? 0, chg?.h24 ?? 0];
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0);
  const span = max - min || 1;
  const w = 48;
  const h = 18;
  const pad = 2;
  const pts = vals
    .map((v, i) => {
      const x = pad + (i / 3) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = (chg?.h24 ?? 0) >= 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={cn("inline-block", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={up ? "var(--color-success)" : "var(--color-destructive)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

export function StockChart({
  tokenAddress,
  symbol,
}: {
  tokenAddress: string;
  symbol: string;
}) {
  const official = STOCK_BY_ADDRESS[tokenAddress.toLowerCase()];
  const dex = useDexPair(official ? tokenAddress : undefined);
  const board = usePriceBoard();
  const hydrated = useHydrated();
  const [source, setSource] = useState<ChartSource>("dexscreener");
  const [tf, setTf] = useState<ChartTimeframe>("1H");
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setTf(readStoredTf());
  }, [hydrated]);

  function chooseTf(next: ChartTimeframe) {
    setTf(next);
    try {
      window.localStorage.setItem(TF_KEY, next);
    } catch {
      /* ignore quota */
    }
  }

  const quote = official
    ? quoteMap(board.data?.stocks)[official.symbol]
    : undefined;
  const pair = dex.data ?? null;
  const tfMeta = TIMEFRAMES.find((t) => t.id === tf) ?? TIMEFRAMES[2];
  const geckoOk = Boolean(pair && isEvmAddress(pair.pairAddress));
  const activeSource: ChartSource =
    source === "geckoterminal" && !geckoOk ? "dexscreener" : source;

  const embedSrc = useMemo(() => {
    if (!pair) return "";
    if (activeSource === "geckoterminal") {
      return geckoEmbedSrc(pair.pairAddress, tfMeta.gecko);
    }
    return dexEmbedSrc(pair.pairAddress, tfMeta.dex);
  }, [pair, activeSource, tfMeta]);

  useEffect(() => {
    setFrameReady(false);
  }, [embedSrc]);

  const basis = basisView({
    ammUsd: pair?.priceUsd,
    chainlinkUsd: quote?.oracle ?? 0,
    feedStatus: quote?.status,
    sequencer: board.data?.sequencer,
  });

  if (!official) {
    return (
      <EmptyChart
        title="Not a Coinbase Tokenized Stock"
        body="Percorium only charts official B20 addresses. Lookalikes are dropped — no embed."
      />
    );
  }

  if (dex.isLoading) {
    return (
      <section className="rounded-xl bg-card p-5 shadow-border">
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="mt-4 h-chart w-full rounded-lg xl:h-chart-xl" />
      </section>
    );
  }

  if (!pair) {
    return (
      <EmptyChart
        title="No official USDC pool yet — trading disabled"
        body="No Aerodrome/DEX USDC pair was found for this Coinbase stock. Percorium will not embed a random pair."
      />
    );
  }

  return (
    <section className="rounded-xl bg-card p-4 shadow-border sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl tracking-tight">{symbol}</h2>
            <Badge variant="outline">{pair.dexId}</Badge>
            <a
              href={`https://dexscreener.com/base/${pair.pairAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Pair {pair.pairAddress.slice(0, 6)}…{pair.pairAddress.slice(-4)}
              <ExternalLink className="ml-1 inline size-3" />
            </a>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Stat k="AMM" v={formatUsd(pair.priceUsd)} />
            <Stat k="Chainlink" v={formatUsd(quote?.oracle ?? 0)} />
            <Stat k="24h vol" v={formatCompactUsd(pair.volume24h)} />
            <Stat k="Liquidity" v={formatCompactUsd(pair.liquidityUsd)} />
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BasisChip tone={basis.tone} label={basis.label} />
            {pair.priceChange.h24 != null ? (
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  pair.priceChange.h24 >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatSignedPct(pair.priceChange.h24)} 24h
              </span>
            ) : null}
          </div>
        </div>
        <Tabs
          value={activeSource}
          onValueChange={(v) => setSource(v as ChartSource)}
          className="shrink-0"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="dexscreener">DexScreener</TabsTrigger>
            <TabsTrigger value="geckoterminal" disabled={!geckoOk}>
              GeckoTerminal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => chooseTf(t.id)}
            className={cn(
              "h-11 min-w-11 shrink-0 rounded-md px-3 text-sm transition-colors duration-150",
              tf === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-lg bg-elevated">
        {!frameReady ? (
          <Skeleton className="absolute inset-0 z-10 h-full w-full rounded-lg" />
        ) : null}
        {embedSrc ? (
          <iframe
            title={`${symbol} ${activeSource} chart`}
            src={embedSrc}
            className="h-chart w-full rounded-lg border-0 xl:h-chart-xl"
            allow="clipboard-write"
            onLoad={() => setFrameReady(true)}
          />
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {CHART_CAPTION}
      </p>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {k}
      </dt>
      <dd className="font-mono text-sm tabular-nums">{v}</dd>
    </div>
  );
}

function EmptyChart({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-border">
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {CHART_CAPTION}
      </p>
    </section>
  );
}

export function IndexNavCard() {
  return (
    <section className="rounded-xl bg-card p-5 shadow-border">
      <h2 className="font-display text-xl tracking-tight">Index NAV is not a DEX pair</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        This slab is priced from Chainlink total-return feeds on the
        constituents plus USDC cash. Percorium will not embed a random
        Aerodrome chart as if it were the index.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {CHART_CAPTION}
      </p>
    </section>
  );
}

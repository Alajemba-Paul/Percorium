import { parseUnits } from "viem";
import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { useMemo, useState } from "react";
import { ArrowDownUp, CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ERC20_ABI } from "@/lib/percorium/abis";
import {
  STOCKS,
  STOCK_BY_SYMBOL,
  USDC,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { formatNum, formatUsd } from "@/lib/percorium/format";
import { fetchSwapQuote } from "@/lib/percorium/quote";
import type { QuoteResult, StockQuote, SwapSide } from "@/lib/percorium/types";
import { useEligibility, usePriceBoard } from "@/hooks/use-board";
import { cn } from "@/lib/utils";

function decimalsFor(token: string) {
  return token.toLowerCase() === USDC.toLowerCase() ? 6 : 18;
}

function failReasons(opts: {
  restricted: boolean;
  sequencerDown: boolean;
  grace: boolean;
  feedBad: boolean;
}): string[] {
  const r: string[] = [];
  if (opts.restricted) r.push("US / restricted jurisdiction");
  if (opts.sequencerDown) r.push("Base sequencer down");
  if (opts.grace) r.push("Sequencer grace period");
  if (opts.feedBad) r.push("Chainlink feed stale or paused");
  return r;
}

export function TradeTicket({
  symbol,
  quote,
}: {
  symbol: StockSymbol;
  quote?: StockQuote;
}) {
  const stock = STOCK_BY_SYMBOL[symbol];
  const { address, isConnected } = useAccount();
  const { restricted } = useEligibility();
  const board = usePriceBoard();
  const [side, setSide] = useState<SwapSide>("buy");
  const [amount, setAmount] = useState("100");
  const [pair, setPair] = useState<StockSymbol>(
    symbol === "NVDAc" ? "AAPLc" : "NVDAc",
  );
  const [quoteRes, setQuoteRes] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: approving } = useWriteContract();

  const sequencer = board.data?.sequencer;
  const feedBad = quote ? quote.status === "paused" || quote.status === "stale" : true;
  const reasons = failReasons({
    restricted,
    sequencerDown: sequencer ? !sequencer.up : true,
    grace: sequencer?.grace ?? false,
    feedBad,
  });
  const locked = reasons.length > 0;

  const route = useMemo(() => {
    if (side === "buy") {
      return { sellToken: USDC, buyToken: stock.address, sellDec: 6 };
    }
    if (side === "sell") {
      return { sellToken: stock.address, buyToken: USDC, sellDec: 18 };
    }
    return {
      sellToken: stock.address,
      buyToken: STOCK_BY_SYMBOL[pair].address,
      sellDec: 18,
    };
  }, [side, stock.address, pair]);

  const buyLabel =
    side === "buy" ? stock.symbol : side === "sell" ? "USDC" : pair;

  async function onQuote() {
    setQuoting(true);
    try {
      const sellAmount = parseUnits(amount || "0", route.sellDec).toString();
      const res = await fetchSwapQuote({
        data: {
          sellToken: route.sellToken,
          buyToken: route.buyToken,
          sellAmount,
          taker: address,
        },
      });
      setQuoteRes(res);
      if (res.error && !res.buyAmount) toast.error(res.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setQuoting(false);
    }
  }

  async function onExecute() {
    if (locked || !quoteRes?.ok || !quoteRes.to || !quoteRes.data) {
      toast.error("Ticket is fail-closed. No executable route.");
      return;
    }
    try {
      if (quoteRes.allowanceTarget && address) {
        await writeContractAsync({
          address: route.sellToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [quoteRes.allowanceTarget, BigInt(quoteRes.sellAmount)],
        });
      }
      const hash = await sendTransactionAsync({
        to: quoteRes.to,
        data: quoteRes.data,
        value: quoteRes.value ? BigInt(quoteRes.value) : 0n,
      });
      toast.success(`Submitted ${hash.slice(0, 10)}…`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction rejected");
    }
  }

  const buyDec = decimalsFor(route.buyToken);
  const buyAmt = quoteRes
    ? Number(quoteRes.buyAmount) / 10 ** buyDec
    : 0;
  const oraclePx = quote?.oracle ?? 0;
  const implied =
    side === "buy" && Number(amount) > 0 ? buyAmt / Number(amount) : 0;

  return (
    <div className="rounded-xl bg-card p-5 shadow-border">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Ticket</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          0x · 1inch fallback
        </span>
      </div>
      <Tabs value={side} onValueChange={(v) => setSide(v as SwapSide)}>
        <TabsList className="w-full">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
          <TabsTrigger value="swap">Swap</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        <div>
          <Label>
            {side === "buy" ? "USDC to spend" : `Sell ${stock.symbol}`}
          </Label>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        {side === "swap" ? (
          <div>
            <Label>Buy</Label>
            <Select value={pair} onValueChange={(v) => setPair(v as StockSymbol)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCKS.filter((s) => s.symbol !== symbol).map((s) => (
                  <SelectItem key={s.symbol} value={s.symbol}>
                    {s.symbol} · {s.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button
          variant="secondary"
          className="w-full"
          onClick={onQuote}
          disabled={quoting || !amount}
        >
          {quoting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowDownUp className="size-4" />
          )}
          Quote
        </Button>
      </div>

      {quoteRes ? (
        <dl className="mt-4 space-y-2 rounded-lg bg-elevated p-3 text-sm">
          <Row
            k="You receive"
            v={`${formatNum(buyAmt, 4)} ${buyLabel}`}
          />
          <Row k="Source" v={quoteRes.source} />
          {oraclePx > 0 && side === "buy" && implied > 0 ? (
            <Row
              k="Premium vs Chainlink"
              v={`${(((1 / implied) / oraclePx - 1) * 100).toFixed(2)}%`}
            />
          ) : null}
          {oraclePx > 0 ? (
            <Row k="Oracle (risk price)" v={formatUsd(oraclePx, 2)} />
          ) : null}
          {quoteRes.estimatedGas ? (
            <Row k="Est. gas" v={quoteRes.estimatedGas} />
          ) : null}
          {quoteRes.issues?.map((issue) => (
            <p key={issue} className="text-xs text-muted-foreground">
              {issue}
            </p>
          ))}
        </dl>
      ) : null}

      {locked ? (
        <div className="mt-4 flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Fail-closed</p>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <Button
        className={cn("mt-4 w-full")}
        disabled={
          locked ||
          !quoteRes?.ok ||
          sending ||
          approving ||
          !isConnected
        }
        onClick={onExecute}
      >
        {sending || approving
          ? "Submitting"
          : !isConnected
            ? "Connect to execute"
            : `Execute ${side}`}
      </Button>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Allowlist: official Coinbase B20 addresses only. AMM print is premium or
        discount, not the risk price.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono tabular-nums text-foreground">{v}</dd>
    </div>
  );
}

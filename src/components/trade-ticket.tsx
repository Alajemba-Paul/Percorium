import { parseUnits } from "viem";
import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  Sliders,
} from "lucide-react";
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
  AERO_ROUTER,
  ONEINCH_ROUTER_V6,
  PERMIT2,
  STOCKS,
  STOCK_BY_SYMBOL,
  USDC,
  ZERO_EX_ALLOWANCE_HOLDER,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { formatNum, formatUsd } from "@/lib/percorium/format";
import { fetchSwapQuote } from "@/lib/percorium/quote";
import { assertZeroExTarget } from "@/lib/percorium/security";
import type { QuoteResult, StockQuote, SwapSide } from "@/lib/percorium/types";
import { useEligibility, usePriceBoard } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";
import { cn } from "@/lib/utils";

function decimalsFor(token: string) {
  return token.toLowerCase() === USDC.toLowerCase() ? 6 : 18;
}

function spenderLabelFor(target?: string): string {
  if (!target) return "None";
  const lc = target.toLowerCase();
  if (lc === ZERO_EX_ALLOWANCE_HOLDER.toLowerCase()) return "0x AllowanceHolder";
  if (lc === AERO_ROUTER.toLowerCase()) return "Aerodrome Router";
  if (lc === PERMIT2.toLowerCase()) return "Uniswap Permit2";
  if (lc === ONEINCH_ROUTER_V6.toLowerCase()) return "1inch Router V6";
  return "Unknown Spender";
}

function failReasons(opts: {
  restricted: boolean;
  sequencerDown: boolean;
  grace: boolean;
  feedBad: boolean;
}): string[] {
  const r: string[] = [];
  if (opts.restricted) r.push("Not available in your country");
  if (opts.sequencerDown) r.push("Base network is paused");
  if (opts.grace) r.push("Base network is resuming");
  if (opts.feedBad) r.push("Official price delayed. Buying is paused.");
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
  const [slippageBps, setSlippageBps] = useState<number>(100);
  const [showSlippageConfig, setShowSlippageConfig] = useState(false);
  const balances = useStockBalances();
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
      return {
        sellToken: USDC,
        buyToken: stock.address,
        sellDec: 6,
        sellSymbol: "USDC",
      };
    }
    if (side === "sell") {
      return {
        sellToken: stock.address,
        buyToken: USDC,
        sellDec: 18,
        sellSymbol: stock.symbol,
      };
    }
    return {
      sellToken: stock.address,
      buyToken: STOCK_BY_SYMBOL[pair].address,
      sellDec: 18,
      sellSymbol: stock.symbol,
    };
  }, [side, stock.address, stock.symbol, pair]);

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
          slippageBps,
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
    if (locked) {
      toast.error("Trade is blocked.");
      return;
    }
    if (!address) {
      toast.error("Connect a wallet to trade.");
      return;
    }
    try {
      const sellAmount = parseUnits(amount || "0", route.sellDec).toString();
      const fresh = await fetchSwapQuote({
        data: {
          sellToken: route.sellToken,
          buyToken: route.buyToken,
          sellAmount,
          taker: address,
          slippageBps,
        },
      });
      setQuoteRes(fresh);
      if (!fresh.ok || !fresh.to || !fresh.data) {
        toast.error(fresh.error ?? "No trade route found. Please try again.");
        return;
      }

      // Security check: verify destination and allowance spender
      assertZeroExTarget(fresh.to, fresh.allowanceTarget);

      if (fresh.allowanceTarget) {
        const spenderName = spenderLabelFor(fresh.allowanceTarget);
        toast.info(
          `Requesting approval for ${amount} ${route.sellSymbol} to ${spenderName}.`,
        );
        await writeContractAsync({
          address: route.sellToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [fresh.allowanceTarget, BigInt(fresh.sellAmount)],
        });
        toast.success(`Approval confirmed for ${spenderName}.`);
      }

      const hash = await sendTransactionAsync({
        to: fresh.to,
        data: fresh.data,
        value: fresh.value ? BigInt(fresh.value) : 0n,
      });
      toast.success(`Trade submitted: ${hash.slice(0, 10)}…`);
      void balances.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction cancelled");
    }
  }

  const buyDec = decimalsFor(route.buyToken);
  const buyAmt = quoteRes
    ? Number(quoteRes.buyAmount) / 10 ** buyDec
    : 0;
  const oraclePx = quote?.oracle ?? 0;
  const implied =
    side === "buy" && Number(amount) > 0 ? buyAmt / Number(amount) : 0;

  const availableAmt =
    side === "buy"
      ? balances.effectiveUsdc
      : balances.effectiveStock(stock.symbol);
  const availableLabel =
    side === "buy"
      ? `${formatNum(availableAmt, 2)} USDC`
      : `${formatNum(availableAmt, 4)} ${stock.symbol}`;

  return (
    <div className="rounded-xl bg-card p-5 shadow-border">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Trade Ticket</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSlippageConfig(!showSlippageConfig)}
            className="flex items-center gap-1 rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground hover:bg-secondary/80"
            title="Max price slip"
          >
            <Sliders className="size-3" />
            <span>{(slippageBps / 100).toFixed(1)}%</span>
          </button>
          <span className="font-mono text-[11px] text-muted-foreground">
            0x · Aerodrome
          </span>
        </div>
      </div>

      {showSlippageConfig ? (
        <div className="mb-4 rounded-lg border border-border/70 bg-elevated p-3 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span>Max Price Slip (Limit: 3.0%)</span>
            <span className="font-mono tabular-nums">{(slippageBps / 100).toFixed(2)}%</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[50, 100, 200, 300].map((bps) => (
              <button
                key={bps}
                type="button"
                onClick={() => setSlippageBps(bps)}
                className={cn(
                  "flex-1 rounded py-1 font-mono font-medium transition-colors",
                  slippageBps === bps
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                )}
              >
                {(bps / 100).toFixed(1)}%
              </button>
            ))}
          </div>
          {slippageBps > 100 ? (
            <p className="mt-2 text-warn">
              High slip warning: Higher slippage allows worse trade prices. The limit is 3.0%.
            </p>
          ) : null}
        </div>
      ) : null}

      <Tabs value={side} onValueChange={(v) => setSide(v as SwapSide)}>
        <TabsList className="w-full">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
          <TabsTrigger value="swap">Swap</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <Label>
              {side === "buy" ? "USDC to spend" : `Sell ${stock.symbol}`}
            </Label>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Available:</span>
              <span className="font-mono tabular-nums text-foreground">
                {availableLabel}
              </span>
              {availableAmt > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (side === "buy") {
                      setAmount((Math.floor(availableAmt * 100) / 100).toFixed(2));
                    } else {
                      setAmount(availableAmt.toString());
                    }
                  }}
                  className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  MAX
                </button>
              ) : null}
            </div>
          </div>
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
          Get Quote
        </Button>
      </div>

      {quoteRes ? (
        <dl className="mt-4 space-y-2 rounded-lg bg-elevated p-3 text-sm">
          <Row
            k="You receive"
            v={`${formatNum(buyAmt, 4)} ${buyLabel}`}
          />
          <Row k="Route source" v={quoteRes.source} />
          {oraclePx > 0 && side === "buy" && implied > 0 ? (
            <Row
              k="Gap vs official price"
              v={`${(((1 / implied) / oraclePx - 1) * 100).toFixed(2)}%`}
            />
          ) : null}
          {oraclePx > 0 ? (
            <Row k="Official price" v={formatUsd(oraclePx, 2)} />
          ) : null}
          {quoteRes.allowanceTarget ? (
            <div className="mt-2 rounded border border-border/50 bg-background/50 p-2 text-xs">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Verified Spender</span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {spenderLabelFor(quoteRes.allowanceTarget)} ({quoteRes.allowanceTarget.slice(0, 8)}…
                {quoteRes.allowanceTarget.slice(-6)})
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Approval amount: exact {amount} {route.sellSymbol} (no unlimited approval).
              </p>
            </div>
          ) : null}
          {quoteRes.estimatedGas ? (
            <Row k="Est. network fee" v={quoteRes.estimatedGas} />
          ) : null}
          {quoteRes.issues?.map((issue) => (
            <p key={issue} className="text-xs text-muted-foreground">
              {issue}
            </p>
          ))}
          {quoteRes.error ? (
            <p className="text-xs text-destructive">{quoteRes.error}</p>
          ) : null}
          {quoteRes.ok && !quoteRes.executable && !isConnected ? (
            <p className="text-xs text-warn">
              Connect a wallet to get a live executable quote.
            </p>
          ) : null}
        </dl>
      ) : null}

      {locked ? (
        <div className="mt-4 flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Trade is blocked</p>
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
          sending ||
          approving ||
          !isConnected ||
          !quoteRes ||
          quoteRes.source === "oracle"
        }
        onClick={onExecute}
      >
        {sending || approving
          ? "Submitting..."
          : !isConnected
            ? "Connect Wallet to Trade"
            : quoteRes?.source === "oracle"
              ? "No Trade Route"
              : side === "buy"
                ? `Buy ${stock.symbol}`
                : side === "sell"
                  ? `Sell ${stock.symbol}`
                  : `Swap ${stock.symbol}`}
      </Button>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Official list: only official Coinbase stock addresses on Base. Exchange prices may trade above or below the official price.
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


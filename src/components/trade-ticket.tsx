import { parseUnits } from "viem";
import { useAccount, usePublicClient, useSendTransaction, useWriteContract } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ERC20_ABI } from "@/lib/percorium/abis";
import {
  STOCKS,
  STOCK_BY_SYMBOL,
  USDC,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { formatNum } from "@/lib/percorium/format";
import { fetchSwapQuote } from "@/lib/percorium/quote";
import { assertZeroExTarget } from "@/lib/percorium/security";
import type { QuoteResult, StockQuote, SwapSide } from "@/lib/percorium/types";
import { useEligibility, usePriceBoard } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";
import { cn } from "@/lib/utils";

function decimalsFor(token: string) {
  return token.toLowerCase() === USDC.toLowerCase() ? 6 : 8;
}

export function TradeTicket({
  symbol,
  quote,
}: {
  symbol: StockSymbol;
  quote?: StockQuote;
}) {
  const stock = STOCK_BY_SYMBOL[symbol] ?? STOCKS[0];
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { restricted } = useEligibility();
  const board = usePriceBoard();
  const [side, setSide] = useState<SwapSide>("buy");
  const [amount, setAmount] = useState("100");
  const [slippageBps, setSlippageBps] = useState<number>(100);
  const [showSlippageConfig, setShowSlippageConfig] = useState(false);
  const balances = useStockBalances();
  const [quoteRes, setQuoteRes] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: approving } = useWriteContract();

  const sequencer = board.data?.sequencer;
  const feedBad = quote ? quote.status === "paused" || quote.status === "stale" : false;
  const isBlocked = restricted || (sequencer ? !sequencer.up : false) || feedBad;

  const route = useMemo(() => {
    if (side === "buy") {
      return {
        sellToken: USDC,
        buyToken: stock.address,
        sellDec: 6,
        sellSymbol: "USDC",
      };
    }
    return {
      sellToken: stock.address,
      buyToken: USDC,
      sellDec: 8,
      sellSymbol: stock.symbol,
    };
  }, [side, stock.address, stock.symbol]);

  const buyLabel = side === "buy" ? stock.symbol : "USDC";
  const aerodromeSwapUrl = `https://aerodrome.finance/swap?from=USDC&to=${stock.address}`;

  useEffect(() => {
    let unmounted = false;
    async function loadQuote() {
      if (!amount || Number(amount) <= 0) return;
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
        if (!unmounted) {
          setQuoteRes(res);
        }
      } catch {
        if (!unmounted) {
          setQuoteRes(null);
        }
      } finally {
        if (!unmounted) setQuoting(false);
      }
    }

    const timer = setTimeout(() => {
      loadQuote();
    }, 200);

    return () => {
      unmounted = true;
      clearTimeout(timer);
    };
  }, [stock.address, side, amount, address, slippageBps, route.sellDec, route.sellToken, route.buyToken]);

  async function onExecute() {
    if (restricted) {
      toast.error("Not available in the US.");
      return;
    }
    if (!address || !isConnected) {
      toast.error("Connect a wallet to trade.");
      return;
    }
    if (!publicClient) {
      toast.error("Base RPC is not ready. Retry in a second.");
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

      assertZeroExTarget(fresh.to, fresh.allowanceTarget);

      if (fresh.allowanceTarget) {
        const current = await publicClient.readContract({
          address: route.sellToken,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, fresh.allowanceTarget],
        });
        if (current < BigInt(fresh.sellAmount)) {
          toast.info(`Approve ${amount} ${route.sellSymbol} in your wallet, then wait for confirmation.`);
          const approveHash = await writeContractAsync({
            address: route.sellToken,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [fresh.allowanceTarget, BigInt(fresh.sellAmount)],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          toast.success("Approval confirmed on Base. Sign the swap next.");
        }
      }

      const hash = await sendTransactionAsync({
        to: fresh.to,
        data: fresh.data,
        value: fresh.value ? BigInt(fresh.value) : 0n,
      });
      toast.success(`Trade submitted: ${hash.slice(0, 10)}…`);
      void balances.refetch();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Transaction cancelled";
      const friendly = /reverted|Too little received|STF|TRANSFER_FROM_FAILED/i.test(raw)
        ? "Swap reverted. Wait for the approve tx to confirm, then tap Buy again. Thin pool or leftover allowance race."
        : raw;
      toast.error(friendly);
    }
  }

  const buyDec = decimalsFor(route.buyToken);
  const buyAmt = quoteRes
    ? Number(quoteRes.buyAmount) / 10 ** buyDec
    : 0;

  const availableAmt =
    side === "buy"
      ? balances.effectiveUsdc
      : balances.effectiveStock(stock.symbol);
  const availableLabel =
    side === "buy"
      ? `${formatNum(availableAmt, 2)} USDC`
      : `${formatNum(availableAmt, 4)} ${stock.symbol}`;

  const isButtonDisabled =
    isBlocked ||
    sending ||
    approving ||
    !amount ||
    Number(amount) <= 0;

  return (
    <div className="relative z-50 pointer-events-auto rounded-xl bg-[#131511] border border-[#262923] p-4 sm:p-5 shadow-sm space-y-4 font-['IBM_Plex_Sans',sans-serif]">
      <div className="flex items-center justify-between border-b border-[#262923] pb-3">
        <h2 className="font-['Instrument_Serif',serif] text-xl text-[#f1f0e8]">
          Swap
        </h2>
        <div className="flex items-center gap-2.5">
          <a
            href={aerodromeSwapUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-['IBM_Plex_Mono',monospace] text-[11px] text-[#8f9388] hover:text-[#cfd8c6] transition-colors"
          >
            <span>Aerodrome</span>
            <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            onClick={() => setShowSlippageConfig(!showSlippageConfig)}
            className="flex items-center gap-1 rounded bg-[#1a1d18] border border-[#262923] px-2 py-0.5 font-['IBM_Plex_Mono',monospace] text-[11px] text-[#8f9388] hover:text-[#f1f0e8] cursor-pointer"
            title="Slippage tolerance"
          >
            <Sliders className="size-3" />
            <span>{(slippageBps / 100).toFixed(1)}%</span>
          </button>
        </div>
      </div>

      {showSlippageConfig && (
        <div className="rounded-lg border border-[#262923] bg-[#1a1d18] p-3 text-xs space-y-2">
          <div className="flex items-center justify-between text-[#8f9388]">
            <span>Slippage Tolerance</span>
            <span className="font-['IBM_Plex_Mono',monospace] text-[#f1f0e8]">
              {(slippageBps / 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex gap-1.5">
            {[50, 100, 200, 300].map((bps) => (
              <button
                key={bps}
                type="button"
                onClick={() => setSlippageBps(bps)}
                className={cn(
                  "flex-1 rounded py-1 font-['IBM_Plex_Mono',monospace] text-xs font-medium transition cursor-pointer",
                  slippageBps === bps
                    ? "bg-[#cfd8c6] text-[#0c0d0b]"
                    : "bg-[#131511] border border-[#262923] text-[#8f9388] hover:text-[#f1f0e8]",
                )}
              >
                {(bps / 100).toFixed(1)}%
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs value={side} onValueChange={(v) => setSide(v as SwapSide)}>
        <TabsList className="w-full bg-[#1a1d18] border border-[#262923] p-0.5 rounded-lg grid grid-cols-2">
          <TabsTrigger
            value="buy"
            className="rounded-md text-xs font-semibold py-1.5 data-[state=active]:bg-[#cfd8c6] data-[state=active]:text-[#0c0d0b] text-[#8f9388] transition cursor-pointer"
          >
            Buy {stock.symbol}
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="rounded-md text-xs font-semibold py-1.5 data-[state=active]:bg-[#cfd8c6] data-[state=active]:text-[#0c0d0b] text-[#8f9388] transition cursor-pointer"
          >
            Sell {stock.symbol}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <Label className="text-xs text-[#8f9388]">
            {side === "buy" ? "Pay with USDC" : `Sell ${stock.symbol}`}
          </Label>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8f9388]">
            <span>Available:</span>
            <span className="font-['IBM_Plex_Mono',monospace] text-[#f1f0e8]">
              {availableLabel}
            </span>
            {availableAmt > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (side === "buy") {
                    setAmount((Math.floor(availableAmt * 100) / 100).toFixed(2));
                  } else {
                    setAmount(availableAmt.toString());
                  }
                }}
                className="rounded bg-[#1a1d18] border border-[#262923] px-1.5 py-0.5 font-['IBM_Plex_Mono',monospace] text-[10px] font-medium text-[#cfd8c6] hover:bg-[#20241e] cursor-pointer"
              >
                MAX
              </button>
            )}
          </div>
        </div>

        <Input
          className="bg-[#1a1d18] border-[#262923] text-[#f1f0e8] font-['IBM_Plex_Mono',monospace] text-base h-11 focus-visible:ring-[#cfd8c6]"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
        />
      </div>

      <div className="rounded-lg bg-[#1a1d18] border border-[#262923] p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[#8f9388]">
          <span>You receive (est.)</span>
          <span className="font-['IBM_Plex_Mono',monospace] font-bold text-sm text-[#f1f0e8] flex items-center gap-1.5">
            {quoting ? (
              <LoaderCircle className="size-3.5 animate-spin text-[#8f9388]" />
            ) : null}
            <span>
              {buyAmt > 0 ? formatNum(buyAmt, 4) : "0.00"} {buyLabel}
            </span>
          </span>
        </div>
      </div>

      <Button
        type="button"
        className="relative z-50 pointer-events-auto w-full h-11 rounded-lg bg-[#cfd8c6] hover:bg-[#e2ead9] text-[#0c0d0b] text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isButtonDisabled}
        onClick={onExecute}
      >
        {sending || approving ? (
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            <span>Confirming in Wallet...</span>
          </span>
        ) : !isConnected ? (
          "Connect Wallet"
        ) : restricted ? (
          "Not Available in US"
        ) : side === "buy" ? (
          `Buy ${stock.symbol}`
        ) : (
          `Sell ${stock.symbol}`
        )}
      </Button>

      <p className="text-[11px] text-[#8f9388] text-center leading-relaxed font-['IBM_Plex_Sans',sans-serif]">
        Pay with USDC. Approve first, wait for Base confirmation, then sign the swap.
      </p>
    </div>
  );
}

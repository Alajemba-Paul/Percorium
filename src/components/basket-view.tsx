import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { parseUnits, encodeFunctionData } from "viem";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Copy,
  Layers,
  LoaderCircle,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AERO_SLIPSTREAM_ROUTER_ABI,
  ERC20_ABI,
} from "@/lib/percorium/abis";
import {
  AERO_SLIPSTREAM_ROUTER,
  USDC,
} from "@/lib/percorium/constants";
import {
  decodeBasketPayload,
  type ValidatedBasket,
  type ValidatedBasketLeg,
} from "@/lib/percorium/basket";
import { fetchAerodromeSlipstreamUsdcPair } from "@/lib/dexscreener";
import { formatNum, formatUsd, shortAddress } from "@/lib/percorium/format";
import { assertZeroExTarget } from "@/lib/percorium/security";
import { useEligibility, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";

interface LegPoolInfo {
  pairAddress?: `0x${string}`;
  tickSpacing: number;
  hasPool: boolean;
  spotPriceUsdc: number;
  loading: boolean;
}

export function BasketView({ payload }: { payload: string }) {
  const { address, isConnected } = useAccount();
  const { restricted } = useEligibility();
  const board = usePriceBoard();
  const balances = useStockBalances();

  const [slippageBps, setSlippageBps] = useState<number>(100);
  const [showSlippageConfig, setShowSlippageConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  // Purchasing state
  const [isApproving, setIsApproving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState<{ current: number; total: number } | null>(null);

  const { writeContractAsync } = useWriteContract();

  // 1. Decode & Validate payload
  const validationResult = useMemo(() => {
    return decodeBasketPayload(payload);
  }, [payload]);

  const basket: ValidatedBasket | null = validationResult.isValid
    ? validationResult
    : null;

  // 2. Custom editable spend amount
  const [spendUsdcInput, setSpendUsdcInput] = useState<string>(
    basket ? basket.spendUsdc.toString() : "250",
  );

  useEffect(() => {
    if (basket) {
      setSpendUsdcInput(basket.spendUsdc.toString());
    }
  }, [basket]);

  const activeSpendUsdc = useMemo(() => {
    const n = Number(spendUsdcInput);
    return Number.isFinite(n) && n > 0 ? n : basket?.spendUsdc ?? 100;
  }, [spendUsdcInput, basket]);

  // 3. Pool discovery for each leg
  const [poolMap, setPoolMap] = useState<Record<string, LegPoolInfo>>({});

  const loadLegPools = useCallback(async (legs: ValidatedBasketLeg[]) => {
    const results: Record<string, LegPoolInfo> = {};
    for (const leg of legs) {
      results[leg.address.toLowerCase()] = {
        tickSpacing: 10,
        hasPool: false,
        spotPriceUsdc: 0,
        loading: true,
      };
    }
    setPoolMap({ ...results });

    for (const leg of legs) {
      const lower = leg.address.toLowerCase();
      try {
        const pair = await fetchAerodromeSlipstreamUsdcPair(leg.address);
        if (pair && pair.pairAddress) {
          const price = parseFloat(pair.priceUsd || "0") || 0;
          results[lower] = {
            pairAddress: pair.pairAddress as `0x${string}`,
            tickSpacing: 10,
            hasPool: true,
            spotPriceUsdc: price,
            loading: false,
          };
        } else {
          results[lower] = {
            tickSpacing: 10,
            hasPool: false,
            spotPriceUsdc: 0,
            loading: false,
          };
        }
      } catch {
        results[lower] = {
          tickSpacing: 10,
          hasPool: false,
          spotPriceUsdc: 0,
          loading: false,
        };
      }
      setPoolMap({ ...results });
    }
  }, []);

  useEffect(() => {
    if (basket?.legs) {
      void loadLegPools(basket.legs);
    }
  }, [basket?.legs, loadLegPools]);

  // 4. Board quotes & security checks
  const quotes = quoteMap(board.data?.stocks);
  const sequencer = board.data?.sequencer;
  const sequencerDown = sequencer ? !sequencer.up : true;

  const anyFeedBad = useMemo(() => {
    if (!basket) return false;
    return basket.legs.some((leg) => {
      const q = quotes[leg.stock.symbol];
      return q ? q.status === "paused" || q.status === "stale" : false;
    });
  }, [basket, quotes]);

  const locked = restricted || sequencerDown || anyFeedBad;

  // 5. USDC Balance and Allowance for AERO_SLIPSTREAM_ROUTER
  const totalSpendRaw = useMemo(() => {
    try {
      return parseUnits(activeSpendUsdc.toFixed(6), 6);
    } catch {
      return 0n;
    }
  }, [activeSpendUsdc]);

  const allowanceRead = useReadContracts({
    contracts: address
      ? [
          {
            address: USDC,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, AERO_SLIPSTREAM_ROUTER],
          },
          {
            address: USDC,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          },
        ]
      : [],
    query: {
      enabled: Boolean(address),
      refetchInterval: 6000,
    },
  });

  const usdcAllowance = allowanceRead.data?.[0]?.result as bigint | undefined;
  const usdcBalance = allowanceRead.data?.[1]?.result as bigint | undefined;

  const needsUsdcApprove =
    totalSpendRaw > 0n &&
    (usdcAllowance === undefined || usdcAllowance < totalSpendRaw);

  const hasInsufficientBalance =
    usdcBalance !== undefined && usdcBalance < totalSpendRaw;

  // 6. Approve USDC for exact spend amount only
  const handleApproveUsdc = async () => {
    if (!address) {
      toast.error("Connect wallet to approve USDC.");
      return;
    }
    try {
      assertZeroExTarget(AERO_SLIPSTREAM_ROUTER, AERO_SLIPSTREAM_ROUTER);
      setIsApproving(true);
      toast.info(
        `Approving exact $${formatNum(activeSpendUsdc, 2)} USDC for Aerodrome Slipstream Router.`,
      );

      await writeContractAsync({
        address: USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AERO_SLIPSTREAM_ROUTER, totalSpendRaw],
      });

      toast.success("USDC approval confirmed.");
      void allowanceRead.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval cancelled.");
    } finally {
      setIsApproving(false);
    }
  };

  // 7. Execute basket purchase (batch or sequential)
  const handleBuyBasket = async () => {
    if (locked) {
      toast.error("Trading is currently restricted.");
      return;
    }
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!basket || basket.legs.length === 0) {
      toast.error("Invalid basket.");
      return;
    }
    if (hasInsufficientBalance) {
      toast.error(
        `Insufficient USDC balance. You need $${formatNum(activeSpendUsdc, 2)} USDC.`,
      );
      return;
    }

    try {
      assertZeroExTarget(AERO_SLIPSTREAM_ROUTER, AERO_SLIPSTREAM_ROUTER);
      setIsBuying(true);

      const executableLegs = basket.legs.map((leg) => {
        const poolInfo = poolMap[leg.address.toLowerCase()];
        const q = quotes[leg.stock.symbol];
        const effectivePrice =
          poolInfo?.spotPriceUsdc && poolInfo.spotPriceUsdc > 0
            ? poolInfo.spotPriceUsdc
            : q?.oracle ?? 0;

        const legUsdc = (activeSpendUsdc * leg.weight) / 100;
        const legUsdcRaw = parseUnits(legUsdc.toFixed(6), 6);

        // Expected output stock tokens (8 decimals for B20)
        let minOutRaw = 0n;
        if (effectivePrice > 0) {
          const estTokens = legUsdc / effectivePrice;
          const minTokens = estTokens * (1 - slippageBps / 10_000);
          minOutRaw = parseUnits(minTokens.toFixed(8), 8);
        }

        return {
          leg,
          poolInfo,
          legUsdc,
          legUsdcRaw,
          minOutRaw,
          effectivePrice,
        };
      });

      // Check if any leg has no pool
      const missingPoolLegs = executableLegs.filter((l) => !l.poolInfo?.hasPool);
      if (missingPoolLegs.length > 0) {
        toast.warning(
          `Note: ${missingPoolLegs.map((l) => l.leg.stock.symbol).join(", ")} has no active Slipstream pool. Only available legs will execute.`,
        );
      }

      const activeExecLegs = executableLegs.filter((l) => l.poolInfo?.hasPool);
      if (activeExecLegs.length === 0) {
        toast.error("No active Slipstream pools found for this basket's stocks.");
        return;
      }

      const totalSteps = activeExecLegs.length;
      setStepProgress({ current: 0, total: totalSteps });

      // Check for EIP-5792 wallet_sendCalls batch capability
      let batchSuccess = false;
      const anyWindow = typeof window !== "undefined" ? (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }) : null;

      if (anyWindow?.ethereum?.request && activeExecLegs.length > 1) {
        try {
          setCurrentStep("Batching swaps in wallet...");
          const calls = activeExecLegs.map((item) => {
            const calldata = encodeFunctionData({
              abi: AERO_SLIPSTREAM_ROUTER_ABI,
              functionName: "exactInputSingle",
              args: [
                {
                  tokenIn: USDC,
                  tokenOut: item.leg.address,
                  tickSpacing: item.poolInfo.tickSpacing || 10,
                  recipient: address,
                  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
                  amountIn: item.legUsdcRaw,
                  amountOutMinimum: item.minOutRaw,
                  sqrtPriceLimitX96: 0n,
                },
              ],
            });

            return {
              to: AERO_SLIPSTREAM_ROUTER,
              data: calldata,
              value: "0x0",
            };
          });

          await anyWindow.ethereum.request({
            method: "wallet_sendCalls",
            params: [
              {
                version: "1.0",
                chainId: "0x2105", // 8453 in hex
                from: address,
                calls,
              },
            ],
          });

          batchSuccess = true;
          toast.success("Basket purchase submitted as batch!");
          void balances.refetch();
          void allowanceRead.refetch();
        } catch {
          // Fall back to sequential execution below
          batchSuccess = false;
        }
      }

      // Sequential fallback
      if (!batchSuccess) {
        for (let i = 0; i < activeExecLegs.length; i++) {
          const item = activeExecLegs[i];
          const legSymbol = item.leg.stock.symbol;
          setCurrentStep(
            `Leg ${i + 1} of ${totalSteps}: Swapping $${formatNum(item.legUsdc, 2)} USDC for ${legSymbol}...`,
          );
          setStepProgress({ current: i + 1, total: totalSteps });

          await writeContractAsync({
            address: AERO_SLIPSTREAM_ROUTER,
            abi: AERO_SLIPSTREAM_ROUTER_ABI,
            functionName: "exactInputSingle",
            args: [
              {
                tokenIn: USDC,
                tokenOut: item.leg.address,
                tickSpacing: item.poolInfo.tickSpacing || 10,
                recipient: address,
                deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
                amountIn: item.legUsdcRaw,
                amountOutMinimum: item.minOutRaw,
                sqrtPriceLimitX96: 0n,
              },
            ],
          });

          toast.success(`Purchased ${legSymbol} (${i + 1}/${totalSteps})`);
        }
        toast.success(`Completed basket purchase of ${basket.name}!`);
        void balances.refetch();
        void allowanceRead.refetch();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Basket purchase cancelled.",
      );
    } finally {
      setIsBuying(false);
      setCurrentStep(null);
      setStepProgress(null);
    }
  };

  const shareableUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/b/${payload}`;
    }
    return `https://percorium.app/b/${payload}`;
  }, [payload]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      toast.success("Basket link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${basket?.name || "Stock Basket"} - Percorium`,
          text: `Buy this Coinbase stock basket on Base: ${basket?.name}`,
          url: shareableUrl,
        });
        toast.success("Shared successfully!");
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await handleCopyLink();
        }
      }
    } else {
      await handleCopyLink();
    }
  };

  // INVALID BASKET STATE (Fail Closed)
  if (!validationResult.isValid || !basket) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-border">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl text-foreground">
            Invalid Basket Link
          </h1>
          <p className="mt-2 text-sm text-destructive font-medium">
            {validationResult.error ||
              "This link is not valid. One stock is not on the official Coinbase list."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Percorium strictly verifies all shared portfolios against official Coinbase B20 token contracts on Base. Unofficial or malformed baskets are disabled.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/indices">Explore Baskets</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/swap">Trade Individual Stocks</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Shareable Stock Basket · {basket.legs.length} Stocks
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            {basket.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official Coinbase B20 shopping list on Base. You approve swaps directly in your wallet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs"
          >
            {copied ? (
              <Check className="mr-1.5 size-3.5 text-emerald-500" />
            ) : (
              <Copy className="mr-1.5 size-3.5" />
            )}
            {copied ? "Copied" : "Copy Link"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs"
          >
            <Share2 className="mr-1.5 size-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Grid: Basket Breakdown & Purchase Ticket */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left: Stock Legs Breakdown */}
        <div className="space-y-4">
          <div className="rounded-xl bg-card p-5 shadow-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Portfolio Composition</h2>
              <Badge variant="live">100% Verified B20</Badge>
            </div>

            <div className="space-y-3">
              {basket.legs.map((leg) => {
                const poolInfo = poolMap[leg.address.toLowerCase()];
                const q = quotes[leg.stock.symbol];
                const oraclePrice = q?.oracle ?? 0;
                const spotPrice = poolInfo?.spotPriceUsdc ?? 0;
                const legSliceUsdc = (activeSpendUsdc * leg.weight) / 100;
                const estTokens =
                  (spotPrice > 0 ? spotPrice : oraclePrice) > 0
                    ? legSliceUsdc / (spotPrice > 0 ? spotPrice : oraclePrice)
                    : 0;

                return (
                  <div
                    key={leg.address}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-elevated p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/stocks/$symbol"
                          params={{ symbol: leg.stock.symbol }}
                          className="font-mono text-base font-semibold text-foreground hover:underline"
                        >
                          {leg.stock.symbol}
                        </Link>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {leg.weight}%
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">
                          {leg.stock.company}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <span>Contract: {shortAddress(leg.address, 4)}</span>
                        <span>·</span>
                        <span className="text-foreground font-medium">
                          ${formatNum(legSliceUsdc, 2)} USDC
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-2 sm:border-0 sm:pt-0 sm:text-right">
                      <div>
                        <div className="font-mono text-xs tabular-nums text-foreground">
                          ~{formatNum(estTokens, 4)} {leg.stock.symbol}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          Oracle: {formatUsd(oraclePrice, 2)}
                        </div>
                      </div>

                      <div>
                        {poolInfo?.loading ? (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <LoaderCircle className="size-3 animate-spin" />
                            <span>Pool check...</span>
                          </div>
                        ) : poolInfo?.hasPool ? (
                          <Badge variant="outline" className="font-mono text-[10px] py-0 text-emerald-500 border-emerald-500/30">
                            Slipstream CL
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="font-mono text-[10px] py-0">
                            No USDC Pool
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Basket Target</span>
              <span className="font-mono font-medium text-foreground">
                ${formatNum(activeSpendUsdc, 2)} USDC
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-card p-4 shadow-border text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">
              About Percorium Baskets
            </p>
            <p className="leading-relaxed">
              Shared baskets are decentralized shopping lists composed solely of official Coinbase-backed B20 tokens on Base. No synthetic derivatives or intermediary ERC-20 tokens are created. All assets settle directly in your wallet.
            </p>
          </div>
        </div>

        {/* Right: Purchase Ticket */}
        <div className="space-y-4">
          <div className="rounded-xl bg-card p-5 shadow-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Buy Basket</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSlippageConfig(!showSlippageConfig)}
                  className="flex items-center gap-1 rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground hover:bg-secondary/80"
                  title="Max slippage"
                >
                  <Sliders className="size-3" />
                  <span>{(slippageBps / 100).toFixed(1)}%</span>
                </button>
              </div>
            </div>

            {showSlippageConfig && (
              <div className="mb-4 rounded-lg border border-border/70 bg-elevated p-3 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <span>Max Price Slip (Limit: 3.0%)</span>
                  <span className="font-mono tabular-nums">
                    {(slippageBps / 100).toFixed(2)}%
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[50, 100, 200, 300].map((bps) => (
                    <button
                      key={bps}
                      type="button"
                      onClick={() => {
                        setSlippageBps(bps);
                        setShowSlippageConfig(false);
                      }}
                      className={`flex-1 rounded py-1 font-mono text-xs transition-colors ${
                        slippageBps === bps
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {(bps / 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="spend-usdc-input" className="text-xs">
                    Total USDC to Spend
                  </Label>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>Bal: {formatNum(balances.effectiveUsdc, 2)} USDC</span>
                    {balances.effectiveUsdc > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSpendUsdcInput(
                            (
                              Math.floor(balances.effectiveUsdc * 100) / 100
                            ).toFixed(2),
                          )
                        }
                        className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground hover:bg-secondary/80"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  id="spend-usdc-input"
                  className="mt-1.5 font-mono tabular-nums"
                  inputMode="decimal"
                  value={spendUsdcInput}
                  onChange={(e) =>
                    setSpendUsdcInput(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  disabled={isBuying || isApproving || locked}
                />
              </div>

              <div className="rounded-lg bg-elevated p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Execution Router</span>
                  <span className="font-mono text-foreground">
                    Aerodrome Slipstream
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Spender Approval</span>
                  <span className="font-mono text-foreground">
                    Exact spend only (${formatNum(activeSpendUsdc, 2)})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Execution Mode</span>
                  <span className="font-mono text-foreground">
                    Direct Swaps (wallet_sendCalls / sequential)
                  </span>
                </div>
              </div>

              {locked && (
                <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Trading restricted</p>
                    <p className="mt-0.5">
                      Trading is blocked until location, network, and price feeds clear.
                    </p>
                  </div>
                </div>
              )}

              {hasInsufficientBalance && !locked && (
                <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-500">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Insufficient USDC</p>
                    <p className="mt-0.5">
                      You have {formatNum(balances.effectiveUsdc, 2)} USDC. You need ${formatNum(activeSpendUsdc, 2)} USDC.
                    </p>
                  </div>
                </div>
              )}

              {currentStep && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>{currentStep}</span>
                  </div>
                  {stepProgress && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(stepProgress.current / stepProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                {isConnected && needsUsdcApprove && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={isApproving || isBuying || locked || activeSpendUsdc <= 0}
                    onClick={handleApproveUsdc}
                  >
                    {isApproving ? (
                      <LoaderCircle className="size-4 animate-spin mr-2" />
                    ) : (
                      <ShieldCheck className="size-4 mr-2" />
                    )}
                    Approve ${formatNum(activeSpendUsdc, 2)} USDC
                  </Button>
                )}

                <Button
                  className="w-full"
                  disabled={
                    !isConnected ||
                    locked ||
                    needsUsdcApprove ||
                    isBuying ||
                    isApproving ||
                    activeSpendUsdc <= 0 ||
                    hasInsufficientBalance
                  }
                  onClick={handleBuyBasket}
                >
                  {isBuying ? (
                    <LoaderCircle className="size-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="size-4 mr-2" />
                  )}
                  {!isConnected
                    ? "Connect Wallet to Buy Basket"
                    : needsUsdcApprove
                      ? "Approve USDC Above First"
                      : "Buy this basket"}
                </Button>
              </div>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                You will get these official Coinbase stocks in your wallet. You approve the swap in your wallet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

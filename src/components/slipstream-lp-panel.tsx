import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { parseUnits, getAddress, maxUint128 } from "viem";
import {
  Coins,
  ExternalLink,
  Info,
  LoaderCircle,
  Plus,
  Minus,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AERO_SLIPSTREAM_NFPM,
  USDC,
  type StockMeta,
  STOCK_BY_ADDRESS,
  type StockSymbol,
} from "@/lib/percorium/constants";
import {
  ERC20_ABI,
  AERO_SLIPSTREAM_NFPM_ABI,
} from "@/lib/percorium/abis";
import { fetchAerodromeSlipstreamUsdcPair, type RawPair } from "@/lib/dexscreener";
import { formatNum, formatUsd, shortAddress } from "@/lib/percorium/format";
import { useEligibility, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";

interface SlipstreamLpPanelProps {
  stock: StockMeta;
}

interface UserPosition {
  tokenId: bigint;
  token0: `0x${string}`;
  token1: `0x${string}`;
  tickSpacing: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

export function SlipstreamLpPanel({ stock }: SlipstreamLpPanelProps) {
  const { address, isConnected } = useAccount();
  const { restricted } = useEligibility();
  const board = usePriceBoard();
  const balances = useStockBalances();
  const { writeContractAsync } = useWriteContract();

  const [stockAmount, setStockAmount] = useState<string>("");
  const [usdcAmount, setUsdcAmount] = useState<string>("");
  const [rangeType, setRangeType] = useState<"narrow" | "wide">("narrow");
  const [slippageBps] = useState<number>(100); // 1% default slippage
  const [activeTab, setActiveTab] = useState<"add" | "positions">("add");

  const [poolPair, setPoolPair] = useState<RawPair | null>(null);
  const [loadingPool, setLoadingPool] = useState<boolean>(true);

  const [isApprovingStock, setIsApprovingStock] = useState<boolean>(false);
  const [isApprovingUsdc, setIsApprovingUsdc] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [removingTokenId, setRemovingTokenId] = useState<bigint | null>(null);

  // 1. Verify Official B20 token
  const isOfficial = Boolean(STOCK_BY_ADDRESS[stock.address.toLowerCase()]);

  // 2. Discover Slipstream CL pool on Base via DexScreener
  useEffect(() => {
    let unmounted = false;
    async function loadPool() {
      setLoadingPool(true);
      try {
        const pair = await fetchAerodromeSlipstreamUsdcPair(stock.address);
        if (!unmounted) {
          setPoolPair(pair);
        }
      } catch {
        if (!unmounted) setPoolPair(null);
      } finally {
        if (!unmounted) setLoadingPool(false);
      }
    }
    loadPool();
    return () => {
      unmounted = true;
    };
  }, [stock.address]);

  // 3. Token order for Slipstream (sorted by address)
  const stockAddr = getAddress(stock.address);
  const usdcAddr = getAddress(USDC);
  const isStockToken0 = stockAddr.toLowerCase() < usdcAddr.toLowerCase();
  const token0Addr = isStockToken0 ? stockAddr : usdcAddr;
  const token1Addr = isStockToken0 ? usdcAddr : stockAddr;

  // Tick spacing (Aerodrome Slipstream standard is 10, 50, 100, or 200)
  const tickSpacing = useMemo(() => {
    if (poolPair?.labels?.some((l) => l.toLowerCase().includes("10"))) return 10;
    if (poolPair?.labels?.some((l) => l.toLowerCase().includes("50"))) return 50;
    if (poolPair?.labels?.some((l) => l.toLowerCase().includes("100"))) return 100;
    if (poolPair?.labels?.some((l) => l.toLowerCase().includes("200"))) return 200;
    return 10; // default Slipstream tickSpacing
  }, [poolPair]);

  // Effective spot / oracle price
  const quotes = quoteMap(board.data?.stocks);
  const oraclePrice = quotes[stock.symbol as StockSymbol]?.oracle ?? 0;
  const spotPrice = Number(poolPair?.priceUsd) > 0 ? Number(poolPair?.priceUsd) : oraclePrice;

  // 4. Balances and Allowances
  const stockHolding = balances.stocks?.[stock.symbol as StockSymbol] ?? { raw: "0", units: 0 };
  const stockBalanceNum = stockHolding.units;
  const usdcBalanceNum = balances.effectiveUsdc;

  const { data: allowanceData, refetch: refetchAllowances } = useReadContracts({
    contracts: [
      {
        address: stockAddr,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, AERO_SLIPSTREAM_NFPM] : undefined,
      },
      {
        address: usdcAddr,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, AERO_SLIPSTREAM_NFPM] : undefined,
      },
    ],
    query: {
      enabled: Boolean(address && isConnected),
    },
  });

  const stockAllowance = (allowanceData?.[0]?.result as bigint | undefined) ?? 0n;
  const usdcAllowance = (allowanceData?.[1]?.result as bigint | undefined) ?? 0n;

  // 5. Query user's NFPM NFT positions
  const { data: userNftBalance, refetch: refetchNftBalance } = useReadContracts({
    contracts: [
      {
        address: AERO_SLIPSTREAM_NFPM,
        abi: AERO_SLIPSTREAM_NFPM_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
    ],
    query: {
      enabled: Boolean(address && isConnected),
    },
  });

  const nftCount = Number(userNftBalance?.[0]?.result ?? 0n);
  const tokenIndices = useMemo(() => {
    const indices: number[] = [];
    const count = Math.min(nftCount, 20);
    for (let i = 0; i < count; i++) {
      indices.push(i);
    }
    return indices;
  }, [nftCount]);

  const { data: tokenIdData, refetch: refetchTokenIds } = useReadContracts({
    contracts: tokenIndices.map((idx) => ({
      address: AERO_SLIPSTREAM_NFPM,
      abi: AERO_SLIPSTREAM_NFPM_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: address ? [address, BigInt(idx)] : undefined,
    })),
    query: {
      enabled: Boolean(address && isConnected && tokenIndices.length > 0),
    },
  });

  const tokenIds = useMemo(() => {
    if (!tokenIdData) return [];
    return tokenIdData
      .map((d) => d.result as bigint | undefined)
      .filter((id): id is bigint => id !== undefined);
  }, [tokenIdData]);

  const { data: positionsData, refetch: refetchPositions } = useReadContracts({
    contracts: tokenIds.map((tid) => ({
      address: AERO_SLIPSTREAM_NFPM,
      abi: AERO_SLIPSTREAM_NFPM_ABI,
      functionName: "positions",
      args: [tid],
    })),
    query: {
      enabled: tokenIds.length > 0,
    },
  });

  const userPositions: UserPosition[] = useMemo(() => {
    if (!positionsData || positionsData.length === 0) return [];
    const list: UserPosition[] = [];
    positionsData.forEach((res, index) => {
      if (!res.result) return;
      const tid = tokenIds[index];
      const p = res.result as unknown as {
        token0: `0x${string}`;
        token1: `0x${string}`;
        tickSpacing: number;
        tickLower: number;
        tickUpper: number;
        liquidity: bigint;
        tokensOwed0: bigint;
        tokensOwed1: bigint;
      };

      if (
        p.token0.toLowerCase() === token0Addr.toLowerCase() &&
        p.token1.toLowerCase() === token1Addr.toLowerCase()
      ) {
        list.push({
          tokenId: tid,
          token0: p.token0,
          token1: p.token1,
          tickSpacing: p.tickSpacing,
          tickLower: p.tickLower,
          tickUpper: p.tickUpper,
          liquidity: p.liquidity,
          tokensOwed0: p.tokensOwed0,
          tokensOwed1: p.tokensOwed1,
        });
      }
    });
    return list;
  }, [positionsData, tokenIds, token0Addr, token1Addr]);

  // Handle Equal Value Calculation
  const handleUseEqualValue = () => {
    const sNum = Number(stockAmount);
    if (sNum > 0 && spotPrice > 0) {
      const neededUsdc = sNum * spotPrice;
      setUsdcAmount(neededUsdc.toFixed(2));
      toast.info(`Calculated equal value: $${formatNum(neededUsdc, 2)} USDC`);
    } else {
      const uNum = Number(usdcAmount);
      if (uNum > 0 && spotPrice > 0) {
        const neededStock = uNum / spotPrice;
        setStockAmount(neededStock.toFixed(4));
        toast.info(`Calculated equal value: ~${formatNum(neededStock, 4)} ${stock.symbol}`);
      } else {
        toast.warning("Please enter either stock amount or USDC amount first.");
      }
    }
  };

  // 6. Approve Stock
  const handleApproveStock = async () => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }
    const num = Number(stockAmount);
    if (num <= 0) {
      toast.error(`Please enter a valid ${stock.symbol} amount.`);
      return;
    }
    try {
      setIsApprovingStock(true);
      const rawAmt = parseUnits(num.toFixed(8), 8);
      toast.info(`Approving ${stock.symbol} to Aerodrome NFPM...`);
      await writeContractAsync({
        address: stockAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AERO_SLIPSTREAM_NFPM, rawAmt],
      });
      toast.success(`${stock.symbol} approved for exact entered amount.`);
      await refetchAllowances();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsApprovingStock(false);
    }
  };

  // 7. Approve USDC
  const handleApproveUsdc = async () => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }
    const num = Number(usdcAmount);
    if (num <= 0) {
      toast.error("Please enter a valid USDC amount.");
      return;
    }
    try {
      setIsApprovingUsdc(true);
      const rawAmt = parseUnits(num.toFixed(6), 6);
      toast.info("Approving USDC to Aerodrome NFPM...");
      await writeContractAsync({
        address: usdcAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AERO_SLIPSTREAM_NFPM, rawAmt],
      });
      toast.success("USDC approved for exact entered amount.");
      await refetchAllowances();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsApprovingUsdc(false);
    }
  };

  // 8. Add Liquidity (Mint on NFPM)
  const handleAddLiquidity = async () => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (restricted) {
      toast.error("Operation not permitted in your jurisdiction (US/sanctioned).");
      return;
    }
    if (!isOfficial) {
      toast.error("Official Coinbase B20 tokens only.");
      return;
    }

    const sNum = Number(stockAmount);
    const uNum = Number(usdcAmount);

    if (sNum <= 0 || uNum <= 0) {
      toast.error("Please enter positive amounts for both stock and USDC.");
      return;
    }

    const rawStock = parseUnits(sNum.toFixed(8), 8);
    const rawUsdc = parseUnits(uNum.toFixed(6), 6);

    if (rawStock > stockAllowance) {
      toast.error(`Please approve ${stock.symbol} first.`);
      return;
    }
    if (rawUsdc > usdcAllowance) {
      toast.error("Please approve USDC first.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Desired amounts sorted according to token0 / token1
      const amount0Desired = isStockToken0 ? rawStock : rawUsdc;
      const amount1Desired = isStockToken0 ? rawUsdc : rawStock;

      const amount0Min = (amount0Desired * BigInt(10_000 - slippageBps)) / 10_000n;
      const amount1Min = (amount1Desired * BigInt(10_000 - slippageBps)) / 10_000n;

      // Price ratio & tick estimation
      // priceRatio = token1 / token0
      // If token0 is Stock (8 dec) and token1 is USDC (6 dec), price in pool = USDC / Stock * 1e2
      // 1 stock = spotPrice USDC -> 1e8 stock units = spotPrice * 1e6 USDC units
      // ratio = (spotPrice * 1e6) / 1e8 = spotPrice / 100
      let baseTick = 0;
      if (spotPrice > 0) {
        const rawRatio = isStockToken0 ? spotPrice / 100 : (1 / spotPrice) * 100;
        if (rawRatio > 0) {
          baseTick = Math.round(Math.log(rawRatio) / Math.log(1.0001));
        }
      }

      // Range offset in ticks
      const tickDelta = rangeType === "narrow" ? 500 : 1500;
      const tickLower = Math.floor((baseTick - tickDelta) / tickSpacing) * tickSpacing;
      const tickUpper = Math.ceil((baseTick + tickDelta) / tickSpacing) * tickSpacing;

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20m

      toast.info("Submitting mint transaction to Aerodrome Slipstream NFPM...");

      await writeContractAsync({
        address: AERO_SLIPSTREAM_NFPM,
        abi: AERO_SLIPSTREAM_NFPM_ABI,
        functionName: "mint",
        args: [
          {
            token0: token0Addr,
            token1: token1Addr,
            tickSpacing,
            tickLower,
            tickUpper,
            amount0Desired,
            amount1Desired,
            amount0Min,
            amount1Min,
            recipient: address,
            deadline,
            sqrtPriceX96: 0n,
          },
        ],
      });

      toast.success("Liquidity position minted successfully on Aerodrome Slipstream!");
      setStockAmount("");
      setUsdcAmount("");
      await Promise.all([
        refetchAllowances(),
        refetchNftBalance(),
        refetchTokenIds(),
        refetchPositions(),
        balances.refetch(),
      ]);
      setActiveTab("positions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add liquidity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Remove Liquidity (decreaseLiquidity + collect + burn)
  const handleRemoveLiquidity = async (pos: UserPosition) => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (restricted) {
      toast.error("Operation not permitted in your jurisdiction.");
      return;
    }
    if (pos.liquidity === 0n) {
      toast.info("Position already has 0 liquidity.");
      return;
    }

    try {
      setRemovingTokenId(pos.tokenId);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      // Step 1: decreaseLiquidity
      toast.info(`Step 1/2: Decreasing liquidity for NFT #${pos.tokenId.toString()}...`);
      await writeContractAsync({
        address: AERO_SLIPSTREAM_NFPM,
        abi: AERO_SLIPSTREAM_NFPM_ABI,
        functionName: "decreaseLiquidity",
        args: [
          {
            tokenId: pos.tokenId,
            liquidity: pos.liquidity,
            amount0Min: 0n,
            amount1Min: 0n,
            deadline,
          },
        ],
      });

      // Step 2: collect tokens
      toast.info(`Step 2/2: Collecting stock & USDC from NFT #${pos.tokenId.toString()}...`);
      await writeContractAsync({
        address: AERO_SLIPSTREAM_NFPM,
        abi: AERO_SLIPSTREAM_NFPM_ABI,
        functionName: "collect",
        args: [
          {
            tokenId: pos.tokenId,
            recipient: address,
            amount0Max: maxUint128,
            amount1Max: maxUint128,
          },
        ],
      });

      toast.success(`Removed and collected liquidity for position #${pos.tokenId.toString()}!`);
      await Promise.all([
        refetchNftBalance(),
        refetchTokenIds(),
        refetchPositions(),
        balances.refetch(),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove liquidity.");
    } finally {
      setRemovingTokenId(null);
    }
  };

  const aerodromeUrl = `https://aerodrome.finance/deposit?token0=${USDC}&token1=${stock.address}`;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-primary" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Earn fees
            </h2>
            <Badge variant="live" className="text-[10px] py-0">
              Slipstream CL
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Put this stock and USDC in the Aerodrome pool. You earn a cut of swap fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={aerodromeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <span>Open on Aerodrome</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Pool Stats Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-elevated/70 p-3 border border-border/40 text-xs">
        <div>
          <div className="text-[11px] text-muted-foreground">Slipstream Pool</div>
          <div className="font-mono font-medium truncate text-foreground flex items-center gap-1">
            {loadingPool ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <LoaderCircle className="size-3 animate-spin" /> Discovering...
              </span>
            ) : poolPair?.pairAddress ? (
              shortAddress(poolPair.pairAddress, 4)
            ) : (
              "Base CL"
            )}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Tick Spacing</div>
          <div className="font-mono font-medium text-foreground">
            {tickSpacing} ticks (CL)
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Spot Price</div>
          <div className="font-mono font-medium text-foreground">
            ${formatNum(spotPrice, 2)} USDC
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Pool Liquidity</div>
          <div className="font-mono font-medium text-foreground">
            {poolPair?.liquidity?.usd ? formatUsd(poolPair.liquidity.usd) : "Active"}
          </div>
        </div>
      </div>

      {/* Tab Switcher: Add Liquidity vs. My Positions */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === "add"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-elevated"
          }`}
        >
          <Plus className="size-3.5" />
          <span>Add liquidity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("positions")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === "positions"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-elevated"
          }`}
        >
          <Minus className="size-3.5" />
          <span>Remove liquidity ({userPositions.length})</span>
        </button>
      </div>

      {/* Tab 1: Add Liquidity */}
      {activeTab === "add" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Stock Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="text-xs font-medium">Stock Amount ({stock.symbol})</Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Bal: {formatNum(stockBalanceNum, 4)}
                </span>
              </div>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="font-mono text-sm pr-16"
                />
                <button
                  type="button"
                  onClick={() => setStockAmount(stockBalanceNum > 0 ? stockBalanceNum.toString() : "0")}
                  className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-elevated hover:bg-elevated/80 text-muted-foreground cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* USDC Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <Label className="text-xs font-medium">USDC Amount</Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Bal: ${formatNum(usdcBalanceNum, 2)}
                </span>
              </div>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="font-mono text-sm pr-16"
                />
                <button
                  type="button"
                  onClick={() => setUsdcAmount(usdcBalanceNum > 0 ? usdcBalanceNum.toString() : "0")}
                  className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-elevated hover:bg-elevated/80 text-muted-foreground cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Range & Helpers */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Range:</span>
              <div className="inline-flex rounded-md bg-elevated p-0.5 border border-border/50">
                <button
                  type="button"
                  onClick={() => setRangeType("narrow")}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition cursor-pointer ${
                    rangeType === "narrow"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Narrow (±5%)
                </button>
                <button
                  type="button"
                  onClick={() => setRangeType("wide")}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition cursor-pointer ${
                    rangeType === "wide"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Wide (±15%)
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseEqualValue}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              <Sparkles className="mr-1.5 size-3.5 text-primary" />
              Use equal value
            </Button>
          </div>

          {/* Approvals and Action Buttons */}
          {isConnected ? (
            <div className="space-y-2 pt-2 border-t border-border/60">
              {/* Approval status check */}
              {(() => {
                const sNum = Number(stockAmount) || 0;
                const uNum = Number(usdcAmount) || 0;
                const rawStock = parseUnits(sNum > 0 ? sNum.toFixed(8) : "0", 8);
                const rawUsdc = parseUnits(uNum > 0 ? uNum.toFixed(6) : "0", 6);

                const needsStockApproval = rawStock > 0n && rawStock > stockAllowance;
                const needsUsdcApproval = rawUsdc > 0n && rawUsdc > usdcAllowance;

                if (needsStockApproval || needsUsdcApproval) {
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {needsStockApproval ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleApproveStock}
                          disabled={isApprovingStock || sNum <= 0}
                          className="w-full text-xs font-semibold cursor-pointer"
                        >
                          {isApprovingStock ? (
                            <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Check className="mr-1.5 size-3.5" />
                          )}
                          Approve {stock.symbol}
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-medium text-emerald-400 py-1.5">
                          ✓ {stock.symbol} Approved
                        </div>
                      )}

                      {needsUsdcApproval ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleApproveUsdc}
                          disabled={isApprovingUsdc || uNum <= 0}
                          className="w-full text-xs font-semibold cursor-pointer"
                        >
                          {isApprovingUsdc ? (
                            <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Check className="mr-1.5 size-3.5" />
                          )}
                          Approve USDC
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-medium text-emerald-400 py-1.5">
                          ✓ USDC Approved
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Button
                    type="button"
                    onClick={handleAddLiquidity}
                    disabled={isSubmitting || sNum <= 0 || uNum <= 0 || restricted}
                    className="w-full text-xs font-semibold h-10 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                        Adding liquidity on Slipstream...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1.5 size-4" />
                        Add liquidity (NFPM Mint)
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-elevated/40 p-3 text-center text-xs text-muted-foreground">
              Connect your Base wallet to deposit into this Slipstream pool.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User NFPM Positions */}
      {activeTab === "positions" && (
        <div className="space-y-3">
          {userPositions.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-elevated/40 p-6 text-center">
              <Info className="mx-auto size-5 text-muted-foreground mb-2" />
              <p className="text-xs font-medium text-foreground">No active Slipstream positions</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Positions minted for {stock.symbol}/USDC via the NonfungiblePositionManager will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {userPositions.map((pos) => (
                <div
                  key={pos.tokenId.toString()}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-elevated p-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">
                        Position #{pos.tokenId.toString()}
                      </span>
                      <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                        Ticks [{pos.tickLower} .. {pos.tickUpper}]
                      </Badge>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      Liquidity units: {pos.liquidity.toString()}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveLiquidity(pos)}
                    disabled={removingTokenId === pos.tokenId || restricted}
                    className="h-8 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    {removingTokenId === pos.tokenId ? (
                      <>
                        <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Minus className="mr-1.5 size-3.5" />
                        Remove liquidity
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer / Disclaimers */}
      <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t border-border/40">
        <p>
          • Direct onchain integration with Aerodrome Slipstream NFPM ({shortAddress(AERO_SLIPSTREAM_NFPM, 4)}) on Base.
        </p>
        <p>
          • Approvals are requested strictly for the entered amounts. Recipient is always your connected wallet.
        </p>
      </div>
    </div>
  );
}

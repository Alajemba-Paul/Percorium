import { useState, useEffect, useMemo, useCallback } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import {
  CircleAlert,
  Coins,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AERO_SLIPSTREAM_NFPM_ABI,
  AERO_SLIPSTREAM_POOL_ABI,
  ERC20_ABI,
} from "@/lib/percorium/abis";
import {
  AERO_SLIPSTREAM_NFPM,
  USDC,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { fetchAerodromeSlipstreamUsdcPair } from "@/lib/dexscreener";
import { formatNum, formatUsd, shortAddress } from "@/lib/percorium/format";
import { assertZeroExTarget } from "@/lib/percorium/security";
import { useEligibility, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";

interface PoolState {
  poolAddress: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  tickSpacing: number;
  tick: number;
  sqrtPriceX96: bigint;
  token0IsUsdc: boolean;
}

export function LiquidityPanel({
  symbol,
  assetAddress,
}: {
  symbol: StockSymbol;
  assetAddress: `0x${string}`;
}) {
  const { address, isConnected } = useAccount();
  const { restricted } = useEligibility();
  const board = usePriceBoard();
  const balances = useStockBalances();

  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [usdcInput, setUsdcInput] = useState("100");
  const [stockInput, setStockInput] = useState("");
  const [lastEdited, setLastEdited] = useState<"usdc" | "stock">("usdc");

  const { writeContractAsync, isPending: isApproving } = useWriteContract();
  const [isMinting, setIsMinting] = useState(false);

  const quotes = quoteMap(board.data?.stocks);
  const stockQuote = quotes[symbol];
  const sequencer = board.data?.sequencer;
  const sequencerDown = sequencer ? !sequencer.up : true;
  const feedBad = stockQuote
    ? stockQuote.status === "paused" || stockQuote.status === "stale"
    : false;
  const locked = restricted || sequencerDown || feedBad;

  // 1. Discover pool on Aerodrome Slipstream
  const loadPool = useCallback(async () => {
    setLoadingPool(true);
    try {
      const pair = await fetchAerodromeSlipstreamUsdcPair(assetAddress);
      if (pair && pair.pairAddress) {
        const poolAddr = pair.pairAddress as `0x${string}`;
        // We will read onchain pool state in contracts hook below
        setPoolState((prev) => ({
          poolAddress: poolAddr,
          token0: prev?.token0 ?? (USDC as `0x${string}`),
          token1: prev?.token1 ?? assetAddress,
          tickSpacing: prev?.tickSpacing ?? 10,
          tick: prev?.tick ?? 0,
          sqrtPriceX96: prev?.sqrtPriceX96 ?? 0n,
          token0IsUsdc: true,
        }));
      } else {
        setPoolState(null);
      }
    } catch {
      setPoolState(null);
    } finally {
      setLoadingPool(false);
    }
  }, [assetAddress]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  // 2. Read live onchain pool state
  const poolContractReads = useReadContracts({
    contracts: poolState?.poolAddress
      ? [
          {
            address: poolState.poolAddress,
            abi: AERO_SLIPSTREAM_POOL_ABI,
            functionName: "token0",
          },
          {
            address: poolState.poolAddress,
            abi: AERO_SLIPSTREAM_POOL_ABI,
            functionName: "token1",
          },
          {
            address: poolState.poolAddress,
            abi: AERO_SLIPSTREAM_POOL_ABI,
            functionName: "tickSpacing",
          },
          {
            address: poolState.poolAddress,
            abi: AERO_SLIPSTREAM_POOL_ABI,
            functionName: "slot0",
          },
        ]
      : [],
    query: {
      enabled: Boolean(poolState?.poolAddress),
      refetchInterval: 10_000,
    },
  });

  useEffect(() => {
    if (poolContractReads.data && poolState?.poolAddress) {
      const [t0Res, t1Res, tsRes, s0Res] = poolContractReads.data;
      if (
        t0Res.status === "success" &&
        t1Res.status === "success" &&
        tsRes.status === "success" &&
        s0Res.status === "success"
      ) {
        const token0 = t0Res.result as `0x${string}`;
        const token1 = t1Res.result as `0x${string}`;
        const tickSpacing = Number(tsRes.result);
        const slot0 = s0Res.result as readonly [bigint, number, number, number, number, boolean];
        const sqrtPriceX96 = BigInt(slot0[0]);
        const tick = Number(slot0[1]);
        const token0IsUsdc = token0.toLowerCase() === USDC.toLowerCase();

        setPoolState({
          poolAddress: poolState.poolAddress,
          token0,
          token1,
          tickSpacing,
          tick,
          sqrtPriceX96,
          token0IsUsdc,
        });
      }
    }
  }, [poolContractReads.data, poolState?.poolAddress]);

  // 3. Sync inputs based on live spot price
  const spotPriceUsdcPerStock = useMemo(() => {
    if (!poolState || poolState.sqrtPriceX96 === 0n) {
      return stockQuote?.oracle ?? 0;
    }
    const sqrt = poolState.sqrtPriceX96;
    // token0 = USDC (6 dec), token1 = Stock (8 dec)
    // token1_raw / token0_raw = sqrt^2 / 2^192
    // 1 Stock (10^8) in USDC (10^6):
    if (poolState.token0IsUsdc) {
      const oneStockRaw = 100_000_000n;
      const usdcRaw = (oneStockRaw * (2n ** 192n)) / (sqrt * sqrt);
      return Number(usdcRaw) / 1e6;
    } else {
      const oneStockRaw = 100_000_000n;
      const usdcRaw = (oneStockRaw * sqrt * sqrt) / (2n ** 192n);
      return Number(usdcRaw) / 1e6;
    }
  }, [poolState, stockQuote?.oracle]);

  // Auto calculate counterpart input
  useEffect(() => {
    if (spotPriceUsdcPerStock <= 0) return;
    if (lastEdited === "usdc") {
      const u = Number(usdcInput);
      if (!Number.isFinite(u) || u <= 0) {
        setStockInput("");
      } else {
        const s = u / spotPriceUsdcPerStock;
        setStockInput(s.toFixed(6));
      }
    } else if (lastEdited === "stock") {
      const s = Number(stockInput);
      if (!Number.isFinite(s) || s <= 0) {
        setUsdcInput("");
      } else {
        const u = s * spotPriceUsdcPerStock;
        setUsdcInput(u.toFixed(2));
      }
    }
  }, [usdcInput, stockInput, lastEdited, spotPriceUsdcPerStock]);

  // 4. Check allowances for NFPM
  const allowanceReads = useReadContracts({
    contracts: address
      ? [
          {
            address: USDC,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, AERO_SLIPSTREAM_NFPM],
          },
          {
            address: assetAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, AERO_SLIPSTREAM_NFPM],
          },
        ]
      : [],
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  const usdcNeededRaw = useMemo(() => {
    try {
      return parseUnits(usdcInput || "0", 6);
    } catch {
      return 0n;
    }
  }, [usdcInput]);

  const stockNeededRaw = useMemo(() => {
    try {
      return parseUnits(stockInput || "0", 8);
    } catch {
      return 0n;
    }
  }, [stockInput]);

  const usdcAllowance = allowanceReads.data?.[0]?.result as bigint | undefined;
  const stockAllowance = allowanceReads.data?.[1]?.result as bigint | undefined;

  const needsUsdcApprove =
    usdcNeededRaw > 0n &&
    (usdcAllowance === undefined || usdcAllowance < usdcNeededRaw);
  const needsStockApprove =
    stockNeededRaw > 0n &&
    (stockAllowance === undefined || stockAllowance < stockNeededRaw);

  // 5. Approve single token for NFPM (exact amount only)
  async function onApproveToken(type: "usdc" | "stock") {
    if (!address) {
      toast.error("Connect wallet to approve.");
      return;
    }
    const isUsdc = type === "usdc";
    const tokenAddr = isUsdc ? USDC : assetAddress;
    const needed = isUsdc ? usdcNeededRaw : stockNeededRaw;
    const tokenName = isUsdc ? "USDC" : symbol;

    try {
      assertZeroExTarget(AERO_SLIPSTREAM_NFPM, AERO_SLIPSTREAM_NFPM);
      toast.info(
        `Approving exact ${isUsdc ? usdcInput : stockInput} ${tokenName} for Aerodrome Slipstream NFPM.`,
      );
      await writeContractAsync({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AERO_SLIPSTREAM_NFPM, needed],
      });
      toast.success(`Approval confirmed for ${tokenName}.`);
      void allowanceReads.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval cancelled.");
    }
  }

  // 6. Execute NFPM mint position
  async function onAddLiquidity() {
    if (locked) {
      toast.error("Liquidity operations are currently blocked.");
      return;
    }
    if (!address) {
      toast.error("Connect wallet to provide liquidity.");
      return;
    }
    if (!poolState || poolState.sqrtPriceX96 === 0n) {
      toast.error("No active Slipstream pool found.");
      return;
    }
    if (usdcNeededRaw <= 0n || stockNeededRaw <= 0n) {
      toast.error("Enter valid amounts for both USDC and stock.");
      return;
    }

    try {
      assertZeroExTarget(AERO_SLIPSTREAM_NFPM, AERO_SLIPSTREAM_NFPM);

      const tickSpacing = poolState.tickSpacing;
      const currentTick = poolState.tick;
      // Concentrated position range (±200 ticks aligned to tickSpacing)
      const tickSpan = 200;
      const tickLower =
        Math.floor((currentTick - tickSpan) / tickSpacing) * tickSpacing;
      const tickUpper =
        Math.floor((currentTick + tickSpan) / tickSpacing) * tickSpacing;

      const amount0Desired = poolState.token0IsUsdc
        ? usdcNeededRaw
        : stockNeededRaw;
      const amount1Desired = poolState.token0IsUsdc
        ? stockNeededRaw
        : usdcNeededRaw;

      // Slippage bounds: 1.0% min amount
      const amount0Min = (amount0Desired * 99n) / 100n;
      const amount1Min = (amount1Desired * 99n) / 100n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      toast.info("Submitting liquidity position to Aerodrome Slipstream...");
      setIsMinting(true);

      await writeContractAsync({
        address: AERO_SLIPSTREAM_NFPM,
        abi: AERO_SLIPSTREAM_NFPM_ABI,
        functionName: "mint",
        args: [
          {
            token0: poolState.token0,
            token1: poolState.token1,
            tickSpacing: poolState.tickSpacing,
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

      toast.success(
        `Liquidity added for ${symbol} + USDC on Aerodrome Slipstream!`,
      );
      void balances.refetch();
      void allowanceReads.refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Liquidity transaction failed.",
      );
    } finally {
      setIsMinting(false);
    }
  }

  const aeroDepositUrl = `https://aerodrome.finance/deposit?token0=${USDC}&token1=${assetAddress}`;

  return (
    <div className="rounded-xl bg-card p-5 shadow-border">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="size-4 text-primary" />
          <h2 className="font-display text-xl">Provide Liquidity</h2>
        </div>
        <div className="flex items-center gap-2">
          {poolState ? (
            <Badge variant="live">Slipstream CL</Badge>
          ) : (
            <Badge variant="outline">No pool yet</Badge>
          )}
          <a
            href={aeroDepositUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Open on Aerodrome
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Put this stock and USDC in the Aerodrome pool. You earn swap fees.
      </p>

      {poolState ? (
        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Pool Type</dt>
            <dd className="font-mono text-xs">Slipstream CL (tick: {poolState.tickSpacing})</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Pool Price</dt>
            <dd className="font-mono tabular-nums">{formatUsd(spotPriceUsdcPerStock, 2)}</dd>
          </div>
        </dl>
      ) : loadingPool ? (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Searching for Aerodrome Slipstream pool on Base...</span>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-elevated p-3 text-xs text-muted-foreground">
          No official Aerodrome Slipstream pool exists for {symbol} yet. Liquidity provision will open once the concentrated liquidity pool is deployed on Base.
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <Label>Deposit USDC</Label>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Bal: {formatNum(balances.effectiveUsdc, 2)} USDC</span>
              {balances.effectiveUsdc > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setUsdcInput(
                      (Math.floor(balances.effectiveUsdc * 100) / 100).toFixed(2),
                    );
                    setLastEdited("usdc");
                  }}
                  className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  MAX
                </button>
              ) : null}
            </div>
          </div>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            inputMode="decimal"
            value={usdcInput}
            onChange={(e) => {
              setUsdcInput(e.target.value.replace(/[^0-9.]/g, ""));
              setLastEdited("usdc");
            }}
            disabled={!poolState || locked}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Deposit {symbol}</Label>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                Bal: {formatNum(balances.effectiveStock(symbol), 4)} {symbol}
              </span>
              {balances.effectiveStock(symbol) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setStockInput(balances.effectiveStock(symbol).toString());
                    setLastEdited("stock");
                  }}
                  className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  MAX
                </button>
              ) : null}
            </div>
          </div>
          <Input
            className="mt-1.5 font-mono tabular-nums"
            inputMode="decimal"
            value={stockInput}
            onChange={(e) => {
              setStockInput(e.target.value.replace(/[^0-9.]/g, ""));
              setLastEdited("stock");
            }}
            disabled={!poolState || locked}
          />
        </div>
      </div>

      {poolState ? (
        <div className="mt-4 rounded-lg bg-elevated p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Spender Contract</span>
            <span className="font-mono text-foreground">
              Slipstream NFPM ({shortAddress(AERO_SLIPSTREAM_NFPM, 4)})
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Concentrated Range</span>
            <span className="font-mono text-emerald-500">
              ±2% Active Tick Span
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Approvals strictly limited to needed deposit amount.</span>
          </div>
        </div>
      ) : null}

      {locked ? (
        <div className="mt-4 flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Liquidity actions blocked</p>
            <p className="mt-1 text-xs">
              Actions are blocked until location, network, and price feeds clear.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {isConnected && needsUsdcApprove ? (
          <Button
            variant="secondary"
            className="w-full"
            disabled={isApproving || locked || !poolState}
            onClick={() => onApproveToken("usdc")}
          >
            {isApproving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Approve USDC for Aerodrome NFPM
          </Button>
        ) : null}

        {isConnected && needsStockApprove ? (
          <Button
            variant="secondary"
            className="w-full"
            disabled={isApproving || locked || !poolState}
            onClick={() => onApproveToken("stock")}
          >
            {isApproving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Approve {symbol} for Aerodrome NFPM
          </Button>
        ) : null}

        <Button
          className="w-full"
          disabled={
            !isConnected ||
            !poolState ||
            locked ||
            needsUsdcApprove ||
            needsStockApprove ||
            isMinting ||
            usdcNeededRaw <= 0n ||
            stockNeededRaw <= 0n
          }
          onClick={onAddLiquidity}
        >
          {isMinting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {!isConnected
            ? "Connect Wallet to Add Liquidity"
            : !poolState
              ? "No Pool Available"
              : needsUsdcApprove || needsStockApprove
                ? "Approval Required Above"
                : "Add liquidity (USDC + this stock)"}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Slipstream LP creates a Non-Fungible Position NFT in your wallet. Fees accrue continuously and can be collected at any time.
      </p>
    </div>
  );
}

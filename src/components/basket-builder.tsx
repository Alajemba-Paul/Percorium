import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Coins,
  Copy,
  ExternalLink,
  Plus,
  Share2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  STOCKS,
  STOCK_BY_SYMBOL,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { encodeBasketPayload } from "@/lib/percorium/basket";
import { formatNum } from "@/lib/percorium/format";
import { usePriceBoard, quoteMap } from "@/hooks/use-board";

interface BasketBuilderProps {
  initialSpendUsdc?: string;
  initialName?: string;
  initialStocks?: { symbol: StockSymbol; weight: number }[];
  onBasketCreated?: (payload: string) => void;
}

export const BasketBuilder: React.FC<BasketBuilderProps> = ({
  initialSpendUsdc = "250",
  initialName = "Big Tech Leaders",
  initialStocks = [
    { symbol: "NVDAc", weight: 40 },
    { symbol: "MSFTc", weight: 35 },
    { symbol: "AAPLc", weight: 25 },
  ],
}) => {
  const [name, setName] = useState(initialName);
  const [spendUsdc, setSpendUsdc] = useState(initialSpendUsdc);
  const [selectedStocks, setSelectedStocks] = useState<StockSymbol[]>(
    initialStocks.map((s) => s.symbol),
  );
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialStocks.map((s) => [s.symbol, s.weight])),
  );
  const [copied, setCopied] = useState(false);

  const board = usePriceBoard();
  const quotes = useMemo(
    () => quoteMap(board.data?.stocks),
    [board.data?.stocks],
  );

  const cleanName = useMemo(() => {
    return name.replace(/<[^>]*>?/gm, "").trim().slice(0, 40) || "Shareable Basket";
  }, [name]);

  const spendNum = useMemo(() => {
    const n = Number(spendUsdc);
    return Number.isFinite(n) && n > 0 ? n : 100;
  }, [spendUsdc]);

  const totalWeight = useMemo(() => {
    return selectedStocks.reduce((sum, sym) => sum + (weights[sym] || 0), 0);
  }, [selectedStocks, weights]);

  const isValidWeightSum = totalWeight === 100;
  const isValidLegCount = selectedStocks.length >= 2 && selectedStocks.length <= 10;
  const isBasketValid = isValidWeightSum && isValidLegCount;

  // Encode payload
  const basketPayload = useMemo(() => {
    if (!isBasketValid) return "";
    const legs = selectedStocks.map((sym) => {
      const stock = STOCK_BY_SYMBOL[sym];
      return {
        address: stock.address,
        weight: Math.round(weights[sym] || 0),
      };
    });
    return encodeBasketPayload({
      name: cleanName,
      spendUsdc: spendNum,
      legs,
    });
  }, [cleanName, spendNum, selectedStocks, weights, isBasketValid]);

  const shareableUrl = useMemo(() => {
    if (!basketPayload) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/b/${basketPayload}`;
    }
    return `https://percorium.app/b/${basketPayload}`;
  }, [basketPayload]);

  const handleDistributeEqually = () => {
    if (selectedStocks.length === 0) return;
    const count = selectedStocks.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - baseWeight * count;

    const newWeights: Record<string, number> = {};
    selectedStocks.forEach((sym, index) => {
      newWeights[sym] = baseWeight + (index < remainder ? 1 : 0);
    });
    setWeights(newWeights);
    toast.info(`Weights set equally across ${count} stocks (100% total).`);
  };

  const handleAddStock = (symbol: StockSymbol) => {
    if (selectedStocks.includes(symbol)) return;
    if (selectedStocks.length >= 10) {
      toast.error("Baskets can contain at most 10 stocks.");
      return;
    }
    const nextStocks = [...selectedStocks, symbol];
    setSelectedStocks(nextStocks);

    // Recalculate weights
    const count = nextStocks.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - baseWeight * count;
    const newWeights: Record<string, number> = {};
    nextStocks.forEach((s, idx) => {
      newWeights[s] = baseWeight + (idx < remainder ? 1 : 0);
    });
    setWeights(newWeights);
  };

  const handleRemoveStock = (symbol: StockSymbol) => {
    if (selectedStocks.length <= 2) {
      toast.error("A basket must contain at least 2 stocks.");
      return;
    }
    const nextStocks = selectedStocks.filter((s) => s !== symbol);
    setSelectedStocks(nextStocks);

    // Recalculate weights
    const count = nextStocks.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - baseWeight * count;
    const newWeights: Record<string, number> = {};
    nextStocks.forEach((s, idx) => {
      newWeights[s] = baseWeight + (idx < remainder ? 1 : 0);
    });
    setWeights(newWeights);
  };

  const handleWeightChange = (symbol: StockSymbol, valStr: string) => {
    const rawVal = parseInt(valStr, 10);
    const val = Number.isNaN(rawVal) ? 0 : Math.max(1, Math.min(99, rawVal));
    setWeights((prev) => ({
      ...prev,
      [symbol]: val,
    }));
  };

  const handleCopyLink = async () => {
    if (!shareableUrl) {
      toast.error("Please ensure weights sum to 100% first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      toast.success("Basket link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link to clipboard.");
    }
  };

  const handleShare = async () => {
    if (!shareableUrl) {
      toast.error("Please ensure weights sum to 100% first.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${cleanName} - Percorium Basket`,
          text: `Buy this ${selectedStocks.length}-stock Coinbase portfolio on Base: ${cleanName}`,
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

  const availableToAdd = useMemo(() => {
    return STOCKS.filter((s) => !selectedStocks.includes(s.symbol));
  }, [selectedStocks]);

  return (
    <div className="rounded-xl bg-card p-5 sm:p-6 shadow-border">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="size-5 text-primary" />
            <h2 className="font-display text-2xl tracking-tight">
              Create Shareable Basket
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Bundle official Coinbase B20 stocks into a shareable link. No token minting required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDistributeEqually}
            className="text-xs"
          >
            <SlidersHorizontal className="mr-1.5 size-3.5" />
            Equal Weights
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Basket Config */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="basket-name" className="text-xs">
                Basket Name
              </Label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {name.length}/40
              </span>
            </div>
            <Input
              id="basket-name"
              className="mt-1.5"
              placeholder="e.g., Big Tech Leaders"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="basket-spend" className="text-xs">
              Target Spend (USDC)
            </Label>
            <Input
              id="basket-spend"
              className="mt-1.5 font-mono tabular-nums"
              inputMode="decimal"
              placeholder="250"
              value={spendUsdc}
              onChange={(e) =>
                setSpendUsdc(e.target.value.replace(/[^0-9.]/g, ""))
              }
            />
          </div>

          {/* Add more stocks */}
          {availableToAdd.length > 0 && selectedStocks.length < 10 && (
            <div>
              <Label className="text-xs text-muted-foreground">
                Add Stocks to Basket ({selectedStocks.length}/10)
              </Label>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {availableToAdd.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => handleAddStock(stock.symbol)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-card"
                  >
                    <Plus className="size-3 text-muted-foreground" />
                    <span className="font-mono font-medium">{stock.symbol}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {stock.company}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Weight Allocation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Stocks & Allocation</Label>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs font-medium tabular-nums ${
                  isValidWeightSum ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                Total: {totalWeight}%
              </span>
              {isValidWeightSum ? (
                <Badge variant="live" className="text-[10px] py-0">
                  Valid 100%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-amber-500/40">
                  {totalWeight < 100
                    ? `Need +${100 - totalWeight}%`
                    : `Over by ${totalWeight - 100}%`}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2.5 rounded-lg border border-border/70 bg-elevated p-3">
            {selectedStocks.map((sym) => {
              const stock = STOCK_BY_SYMBOL[sym];
              const w = weights[sym] || 0;
              const usdcSlice = (spendNum * w) / 100;
              const q = quotes[sym];
              const oraclePrice = q?.oracle ?? 0;
              const estShares = oraclePrice > 0 ? usdcSlice / oraclePrice : 0;

              return (
                <div
                  key={sym}
                  className="flex items-center justify-between gap-3 rounded-md bg-card p-2.5 border border-border/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {sym}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {stock?.company}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>${formatNum(usdcSlice, 2)} USDC</span>
                      <span>·</span>
                      <span>~{formatNum(estShares, 4)} shares</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Input
                        className="h-8 w-16 px-2 text-right font-mono text-xs tabular-nums"
                        type="number"
                        min={1}
                        max={99}
                        value={w}
                        onChange={(e) => handleWeightChange(sym, e.target.value)}
                      />
                      <span className="ml-1 text-xs text-muted-foreground">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStock(sym)}
                      disabled={selectedStocks.length <= 2}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                      title={
                        selectedStocks.length <= 2
                          ? "Basket requires at least 2 stocks"
                          : "Remove stock"
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share / Action Bar */}
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">Shareable Link</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {shareableUrl || "Set weights to 100% to generate link"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!isBasketValid}
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
              disabled={!isBasketValid}
              onClick={handleShare}
              className="text-xs"
            >
              <Share2 className="mr-1.5 size-3.5" />
              Share
            </Button>

            {basketPayload ? (
              <Button asChild size="sm" className="text-xs">
                <Link to="/b/$payload" params={{ payload: basketPayload }}>
                  Open Basket
                  <ExternalLink className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" disabled className="text-xs">
                Open Basket
                <ExternalLink className="ml-1.5 size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Shared index links contain official B20 contract addresses. Buyers connect a wallet and execute swaps via Aerodrome Slipstream.
        </p>
      </div>
    </div>
  );
};

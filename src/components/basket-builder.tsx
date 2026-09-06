import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Coins,
  Copy,
  ExternalLink,
  Plus,
  Share2,
  SlidersHorizontal,
  Sparkles,
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
import {
  encodeBasketPayload,
  slugifyBasketName,
  registerCustomBasket,
} from "@/lib/percorium/basket";
import { PRESET_INDICES, type PresetBasket } from "@/lib/percorium/presets";
import { formatNum } from "@/lib/percorium/format";
import { usePriceBoard, quoteMap } from "@/hooks/use-board";
import { StockMark } from "@/components/stock-mark";

interface BasketBuilderProps {
  initialSpendUsdc?: string;
  initialName?: string;
  initialStocks?: { symbol: StockSymbol; weight: number }[];
  selectedPreset?: PresetBasket | null;
  onBasketCreated?: (payload: string) => void;
}

export const BasketBuilder: React.FC<BasketBuilderProps> = ({
  initialSpendUsdc = "250",
  initialName = "Big Tech Titans",
  initialStocks = [
    { symbol: "AAPLc", weight: 25 },
    { symbol: "MSFTc", weight: 25 },
    { symbol: "NVDAc", weight: 25 },
    { symbol: "GOOGLc", weight: 25 },
  ],
  selectedPreset,
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
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Sync when an external preset is selected
  useEffect(() => {
    if (selectedPreset) {
      setName(selectedPreset.name);
      setSpendUsdc(selectedPreset.defaultSpendUsdc.toString());
      setSelectedStocks(selectedPreset.legs.map((l) => l.symbol));
      setWeights(
        Object.fromEntries(selectedPreset.legs.map((l) => [l.symbol, l.weight])),
      );
    }
  }, [selectedPreset]);

  const board = usePriceBoard();
  const quotes = useMemo(
    () => quoteMap(board.data?.stocks),
    [board.data?.stocks],
  );

  const cleanName = useMemo(() => {
    return name.replace(/<[^>]*>?/gm, "").trim().slice(0, 40) || "Custom Stock Basket";
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

  const basketSlug = useMemo(() => {
    return slugifyBasketName(cleanName);
  }, [cleanName]);

  const shareableUrl = useMemo(() => {
    if (!basketPayload || !isBasketValid) return "";
    registerCustomBasket(basketSlug, basketPayload);
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://percorium.app";
    return `${origin}/${basketSlug}`;
  }, [basketPayload, isBasketValid, basketSlug]);

  const handleApplyPreset = (preset: PresetBasket) => {
    setName(preset.name);
    setSpendUsdc(preset.defaultSpendUsdc.toString());
    setSelectedStocks(preset.legs.map((l) => l.symbol));
    setWeights(
      Object.fromEntries(preset.legs.map((l) => [l.symbol, l.weight])),
    );
    toast.success(`Loaded "${preset.name}" preset.`);
  };

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
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
        setCopied(true);
        toast.success("Link copied.");
        setTimeout(() => setCopied(false), 2500);
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      if (urlInputRef.current) {
        urlInputRef.current.focus();
        urlInputRef.current.select();
      }
      toast.info("Copy the link above.");
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
    <div id="custom-curation-builder" className="rounded-xl bg-card p-5 sm:p-6 shadow-border">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="size-5 text-primary" />
            <h2 className="font-display text-2xl tracking-tight">
              Custom Basket Curation
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Curate your own custom basket of 2–10 official Coinbase B20 stocks. Set exact percentage weights and generate a verified link.
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
            Equalize Weights
          </Button>
        </div>
      </div>

      {/* Preset Quick Loader Bar */}
      <div className="mb-6 rounded-lg bg-elevated/70 p-3 border border-border/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            Load from Preset Template
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_INDICES.map((p) => {
            const isCurrent = name === p.name;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer border ${
                  isCurrent
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground hover:bg-card/80 border-border/70 hover:border-primary/40"
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] opacity-70">({p.legs.length})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Basket Config */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="basket-name" className="text-xs font-medium">
                Basket Name
              </Label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {name.length}/40
              </span>
            </div>
            <Input
              id="basket-name"
              className="mt-1.5"
              placeholder="e.g., Custom Growth Basket"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="basket-spend" className="text-xs font-medium">
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
              <Label className="text-xs font-medium text-muted-foreground">
                Add Stocks to Basket ({selectedStocks.length}/10 selected)
              </Label>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {availableToAdd.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => handleAddStock(stock.symbol)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-card cursor-pointer"
                  >
                    <Plus className="size-3 text-muted-foreground" />
                    <StockMark symbol={stock.symbol} size="sm" />
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
            <Label className="text-xs font-medium">Stocks & Allocation</Label>
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

          <div className="space-y-2.5 rounded-lg border border-border/70 bg-elevated p-3 max-h-[380px] overflow-y-auto">
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
                      <StockMark symbol={sym} size="sm" />
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
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 cursor-pointer"
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

      {/* When weights sum to 100: Always-visible Controls (Input readonly URL + Copy link button) */}
      {isBasketValid ? (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-primary" />
                <span className="font-display text-base font-semibold text-foreground">
                  Shareable Basket Link
                </span>
              </div>
              <Badge variant="live" className="text-[10px] py-0.5">
                Ready to Share
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Anyone with this link can view this portfolio and buy into all {selectedStocks.length} official Coinbase stocks on Base.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  ref={urlInputRef}
                  readOnly
                  value={shareableUrl}
                  onFocus={(e) => e.target.select()}
                  className="font-mono text-xs h-10 bg-card border-border/80 pr-3 selection:bg-primary/20 text-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-10 px-4 text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <Check className="mr-1.5 size-4 text-emerald-300" />
                  ) : (
                    <Copy className="mr-1.5 size-4" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShare}
                  className="h-10 px-3 text-xs shrink-0 cursor-pointer"
                >
                  <Share2 className="mr-1.5 size-3.5" />
                  Share
                </Button>

                <a
                  href={`https://warpcast.com/~/compose?text=${encodeURIComponent(`I just curated the ${name} tokenized equity basket on @base using Percorium! 🏛️\n\nTrade official Coinbase stocks with 1:1 DTC backing:`)}&embeds[]=${encodeURIComponent(shareableUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-3 bg-[#7c65c1]/20 hover:bg-[#7c65c1]/30 text-[#d8b4fe] border border-[#7c65c1]/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <span>Warpcast</span>
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just curated the ${name} stock basket on @base with @percorium! Trade Coinbase B20 tokenized equities onchain:`)}&url=${encodeURIComponent(shareableUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-3 bg-[#1d9bf0]/20 hover:bg-[#1d9bf0]/30 text-[#7dd3fc] border border-[#1d9bf0]/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <span>X / Tweet</span>
                </a>

                <Button
                  asChild
                  variant="outline"
                  className="h-10 px-3 text-xs shrink-0 cursor-pointer"
                >
                  <Link to="/$basketname" params={{ basketname: basketSlug }}>
                    <span>Open &amp; Buy</span>
                    <ExternalLink className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border/60 bg-elevated/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {totalWeight !== 100
              ? `Set stock weights to sum to exactly 100% (currently ${totalWeight}%) to generate your shareable link.`
              : "Select between 2 and 10 stocks to generate your shareable link."}
          </p>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Shared basket links contain verified B20 contract addresses. Buyers approve trades directly in their wallet on Base.
      </p>
    </div>
  );
};

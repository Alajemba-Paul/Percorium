import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRESET_INDICES, type PresetBasket } from "@/lib/percorium/presets";
import { STOCK_BY_SYMBOL } from "@/lib/percorium/constants";
import { StockMark } from "@/components/stock-mark";

interface PresetIndicesProps {
  onSelectPreset?: (preset: PresetBasket) => void;
}

export const PresetIndices: React.FC<PresetIndicesProps> = ({ onSelectPreset }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (preset: PresetBasket) => {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://percorium.app";
    const url = `${origin}/b/${preset.payload}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedId(preset.id);
        toast.success(`Copied link for ${preset.name}`);
        setTimeout(() => setCopiedId(null), 2000);
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      toast.info(`Share link: ${url}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-display text-xl sm:text-2xl tracking-tight text-foreground">
              Preset Stock Indices
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {PRESET_INDICES.length} official pre-composed portfolios. One-click buy or customize with your own stock weights.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-[11px] font-mono text-primary border-primary/30">
          {PRESET_INDICES.length} Official Presets
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PRESET_INDICES.map((preset) => (
          <div
            key={preset.id}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 transition hover:border-primary/40 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                      {preset.name}
                    </h3>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground rounded bg-elevated px-1.5 py-0.5 border border-border/60">
                      {preset.ticker}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              </div>

              {/* Stock breakdown */}
              <div className="mt-4 space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">
                  Composition ({preset.legs.length} Stocks)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {preset.legs.map((leg) => {
                    const meta = STOCK_BY_SYMBOL[leg.symbol];
                    return (
                      <div
                        key={leg.symbol}
                        className="flex items-center justify-between rounded-md bg-elevated/70 px-2.5 py-1.5 border border-border/40 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <StockMark symbol={leg.symbol} size="sm" />
                          <span className="font-mono font-medium truncate">
                            {meta?.symbol ?? leg.symbol}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                          {leg.weight}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2 pt-3 border-t border-border/60">
              <Button
                asChild
                size="sm"
                className="h-8 flex-1 text-xs font-semibold"
              >
                <Link to="/b/$payload" params={{ payload: preset.payload }}>
                  <span>Buy Basket</span>
                  <ExternalLink className="ml-1.5 size-3.5" />
                </Link>
              </Button>

              {onSelectPreset && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectPreset(preset);
                    toast.info(`Loaded "${preset.name}" into custom builder.`);
                  }}
                  className="h-8 text-xs font-medium"
                >
                  <SlidersHorizontal className="mr-1.5 size-3.5" />
                  Customize
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopyLink(preset)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="Copy shareable link"
              >
                {copiedId === preset.id ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

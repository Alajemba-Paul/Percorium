import React, { useState } from "react";
import {
  ExternalLink,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BASE_BUILDER_CODE,
  BASE_BUILDER_WALLET,
  COINBASE_STOCKS_REGISTRY,
  AERO_SLIPSTREAM_NFPM,
} from "@/lib/percorium/constants";
import { shortAddress } from "@/lib/percorium/format";

interface BaseBuilderAttributionProps {
  compact?: boolean;
}

export function BaseBuilderAttribution({ compact = false }: BaseBuilderAttributionProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(BASE_BUILDER_CODE);
    setCopied(true);
    toast.success(`Copied Base Builder Code: ${BASE_BUILDER_CODE}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWarpcast = () => {
    const text = encodeURIComponent(
      `Trading official Coinbase B20 tokenized stocks & building index baskets on @base with Percorium!\n\n⚡ Registered Base Builder Code: ${BASE_BUILDER_CODE}\n\nhttps://percorium.vercel.app`
    );
    window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank");
  };

  const shareX = () => {
    const text = encodeURIComponent(
      `Trading official Coinbase B20 tokenized stocks on @base with @percorium!\n\nRegistered Base Builder: ${BASE_BUILDER_CODE}\n\nhttps://percorium.vercel.app`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={copyCode}
          title="Base Builder Code - Click to copy"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a1d18] border border-[#262923] text-[11px] font-mono text-[#cfd8c6] hover:bg-[#22271f] transition cursor-pointer"
        >
          <span className="inline-block size-2 rounded-full bg-[#0052FF]" />
          <span className="font-semibold text-[#f1f0e8]">Base Builder</span>
          <span className="text-[#8f9388]">{BASE_BUILDER_CODE}</span>
          {copied ? (
            <Check className="size-3 text-emerald-400" />
          ) : (
            <Copy className="size-3 text-[#8f9388]" />
          )}
        </button>

        <button
          onClick={shareWarpcast}
          title="Share to Warpcast"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a1d18] border border-[#262923] text-[11px] font-medium text-[#8f9388] hover:text-[#f1f0e8] hover:bg-[#22271f] transition cursor-pointer"
        >
          <Share2 className="size-3" />
          <span>Cast</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#131511] border border-[#262923] p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#262923] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[#0052FF]/15 border border-[#0052FF]/30 flex items-center justify-center text-[#0052FF]">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Instrument_Serif',serif] text-xl text-[#f1f0e8]">
                Verified Base Builder
              </h3>
              <Badge className="bg-[#0052FF]/20 text-[#6ea3ff] border-[#0052FF]/40 text-[10px] font-mono">
                Base dev registry
              </Badge>
            </div>
            <p className="text-xs text-[#8f9388]">
              Attributed to official Base Builder Program (Code: {BASE_BUILDER_CODE})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1d18] border border-[#262923] text-xs font-mono text-[#f1f0e8] hover:bg-[#22271f] transition cursor-pointer"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5 text-[#cfd8c6]" />
            )}
            <span>{BASE_BUILDER_CODE}</span>
          </button>

          <Button
            size="sm"
            onClick={shareWarpcast}
            className="bg-[#472a91] hover:bg-[#5b38b8] text-white text-xs h-8 px-3"
          >
            <Share2 className="size-3.5 mr-1" />
            Share on Warpcast
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={shareX}
            className="border-[#262923] bg-[#1a1d18] text-[#f1f0e8] hover:bg-[#22271f] text-xs h-8 px-3"
          >
            <ArrowUpRight className="size-3.5 mr-1" />
            X / Twitter
          </Button>
        </div>
      </div>

      {/* Verified Contracts List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <a
          href={`https://basescan.org/address/${COINBASE_STOCKS_REGISTRY}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1d18] border border-[#262923] hover:border-[#cfd8c6]/40 transition"
        >
          <div>
            <div className="text-[11px] text-[#8f9388]">Coinbase B20 Registry</div>
            <div className="font-mono text-[#f1f0e8] text-xs">{shortAddress(COINBASE_STOCKS_REGISTRY, 4)}</div>
          </div>
          <ExternalLink className="size-3 text-[#8f9388]" />
        </a>

        <a
          href={`https://basescan.org/address/${AERO_SLIPSTREAM_NFPM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1d18] border border-[#262923] hover:border-[#cfd8c6]/40 transition"
        >
          <div>
            <div className="text-[11px] text-[#8f9388]">Aerodrome NFPM</div>
            <div className="font-mono text-[#f1f0e8] text-xs">{shortAddress(AERO_SLIPSTREAM_NFPM, 4)}</div>
          </div>
          <ExternalLink className="size-3 text-[#8f9388]" />
        </a>

        <a
          href={`https://basescan.org/address/${BASE_BUILDER_WALLET}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1d18] border border-[#262923] hover:border-[#cfd8c6]/40 transition"
        >
          <div>
            <div className="text-[11px] text-[#8f9388]">Builder Wallet</div>
            <div className="font-mono text-[#f1f0e8] text-xs">{shortAddress(BASE_BUILDER_WALLET, 4)}</div>
          </div>
          <ExternalLink className="size-3 text-[#8f9388]" />
        </a>
      </div>
    </div>
  );
}

export function SharePositionButton({
  title: _title,
  symbol: _symbol,
  text,
}: {
  title: string;
  symbol?: string;
  text?: string;
}) {
  const handleShare = () => {
    const defaultMsg = text || `Exploring official Coinbase B20 tokenized stocks on @base with Percorium! Registered Base Builder: ${BASE_BUILDER_CODE}\n\nhttps://percorium.vercel.app`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(defaultMsg)}`, "_blank");
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleShare}
      className="border-[#262923] bg-[#1a1d18] text-[#f1f0e8] hover:bg-[#20241e] text-xs h-8"
    >
      <Share2 className="size-3 mr-1 text-[#cfd8c6]" />
      <span>{title}</span>
    </Button>
  );
}

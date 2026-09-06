import React from "react";
import { ArrowRight, ShoppingBag, Layers, Coins } from "lucide-react";
import { StockPriceData } from "../types";
import { isUsCashClosed } from "@/lib/percorium/format";
import { STOCKS } from "@/lib/percorium/constants";

interface LandingPageProps {
  priceBoard: StockPriceData[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  onLaunchTerminal: (tab: "desk" | "discover" | "slabs" | "lend" | "portfolio") => void;
  onOpenWalletModal: () => void;
  onConnectOnchainKit: (method: "passkey" | "google" | "injected") => void;
  userAddress: string;
  isConnected: boolean;
  walletType?: "injected" | "smart_passkey" | "smart_google";
  userBalanceUsdc: number;
}

const OFFICIAL_LOOPING_TICKERS = [
  { symbol: "NVDAc", name: "NVIDIA Corp", fallbackPrice: 125.40, fallbackChange: 2.14 },
  { symbol: "AAPLc", name: "Apple Inc", fallbackPrice: 228.65, fallbackChange: 0.82 },
  { symbol: "GOOGLc", name: "Alphabet Inc", fallbackPrice: 168.30, fallbackChange: -0.45 },
  { symbol: "METAc", name: "Meta Platforms", fallbackPrice: 512.90, fallbackChange: 1.67 },
  { symbol: "TSLAc", name: "Tesla Inc", fallbackPrice: 218.40, fallbackChange: -1.20 },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  priceBoard,
  onSelectStock,
  onLaunchTerminal,
}) => {
  const isWeekendClosed = isUsCashClosed();

  // Active showcase stock for the screenshot-style panel
  const showcaseStock =
    priceBoard.find((p) => p.symbol === "NVDAc") ||
    priceBoard[0] || {
      symbol: "NVDAc",
      name: "NVIDIA Corp",
      ammPrice: 125.40,
      change24h: 2.14,
      basisBps: 12,
    };

  return (
    <div className="w-full text-[#f1f0e8] font-['IBM_Plex_Sans',sans-serif] space-y-8 sm:space-y-12">
      {/* 1. Hero Stack (Mobile-first max-w-[430px], expands on desktop) */}
      <section className="mx-auto max-w-[430px] sm:max-w-xl md:max-w-2xl text-center pt-2 sm:pt-4 px-2">
        {/* Markets-closed helper chip */}
        {isWeekendClosed && (
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-[#131511] border border-[#262923] text-xs font-['IBM_Plex_Mono',monospace] text-[#8f9388]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c4a46a]" />
            <span>US market closed. You can still trade onchain.</span>
          </div>
        )}

        {/* Title: Instrument Serif, fade + slight rise */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-['Instrument_Serif',serif] tracking-tight text-[#f1f0e8] leading-[1.08] animate-hero-rise">
          Percorium: Stocks in your wallet. Not the brokerage app.
        </h1>

        {/* Animated accent line that draws once */}
        <div className="w-24 sm:w-32 h-[1px] bg-[#cfd8c6] mx-auto my-3 animate-accent-draw" />

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-[#8f9388] mt-2 max-w-md mx-auto leading-relaxed">
          Not a synthetic. It’s the stock, onchain.
        </p>

        {/* Action Buttons (150ms hover/press) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 mt-6 w-full max-w-[360px] mx-auto">
          <button
            onClick={() => onLaunchTerminal("discover")}
            className="h-11 px-5 rounded-lg bg-[#cfd8c6] text-[#0c0d0b] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#e2ead9] active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-sm"
          >
            <span>Browse stocks</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onLaunchTerminal("slabs")}
            className="h-11 px-5 rounded-lg bg-[#131511] text-[#f1f0e8] border border-[#262923] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#1a1d18] hover:border-[#cfd8c6]/40 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <span>Build a basket</span>
          </button>
        </div>
      </section>

      {/* 2. Looping Ticker Tape (NVDAc AAPLc GOOGLc METAc TSLAc sliding slowly) */}
      <section className="border-y border-[#262923] bg-[#0c0d0b] -mx-4 sm:-mx-6 px-4 py-2.5 overflow-hidden">
        <div className="animate-ticker-slide">
          {/* Double the list to enable continuous smooth seamless loop */}
          {[...OFFICIAL_LOOPING_TICKERS, ...OFFICIAL_LOOPING_TICKERS, ...OFFICIAL_LOOPING_TICKERS].map(
            (item, idx) => {
              const liveData = priceBoard.find((p) => p.symbol === item.symbol);
              const price = liveData?.ammPrice ?? item.fallbackPrice;
              const change = liveData?.change24h ?? item.fallbackChange;
              const isPos = change >= 0;

              return (
                <button
                  key={`${item.symbol}-${idx}`}
                  onClick={() => {
                    onSelectStock(item.symbol);
                    onLaunchTerminal("desk");
                  }}
                  className="inline-flex items-center gap-2.5 px-4 py-1 text-xs font-['IBM_Plex_Mono',monospace] hover:text-[#cfd8c6] transition-colors duration-150 shrink-0 cursor-pointer"
                >
                  <span className="font-bold text-[#f1f0e8]">{item.symbol}</span>
                  <span className="text-[#cfd8c6]">${price.toFixed(2)}</span>
                  <span
                    className={`text-[11px] font-medium ${
                      isPos ? "text-[#6f9a72]" : "text-[#c45c4a]"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                  <span className="text-[#262923] pl-2 font-mono">/</span>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* 3. Three Cards Only */}
      <section className="mx-auto max-w-[430px] sm:max-w-xl md:max-w-3xl lg:max-w-4xl px-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Buy or sell */}
          <div
            onClick={() => onLaunchTerminal("desk")}
            className="p-5 rounded-xl bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 transition-all duration-150 cursor-pointer space-y-2 flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-['Instrument_Serif',serif] text-[#f1f0e8] group-hover:text-[#cfd8c6] transition-colors duration-150">
                Buy or sell
              </h3>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Pay with USDC. Approve in your wallet.
              </p>
            </div>
            <div className="pt-2 text-xs text-[#cfd8c6] font-['IBM_Plex_Mono',monospace] flex items-center gap-1">
              <span>Open Desk</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
            </div>
          </div>

          {/* Card 2: Share a basket */}
          <div
            onClick={() => onLaunchTerminal("slabs")}
            className="p-5 rounded-xl bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 transition-all duration-150 cursor-pointer space-y-2 flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-['Instrument_Serif',serif] text-[#f1f0e8] group-hover:text-[#cfd8c6] transition-colors duration-150">
                Share a basket
              </h3>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Send a link. Friends buy the same mix.
              </p>
            </div>
            <div className="pt-2 text-xs text-[#cfd8c6] font-['IBM_Plex_Mono',monospace] flex items-center gap-1">
              <span>Create Basket</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
            </div>
          </div>

          {/* Card 3: Earn fees */}
          <div
            onClick={() => onLaunchTerminal("lend")}
            className="p-5 rounded-xl bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 transition-all duration-150 cursor-pointer space-y-2 flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-['Instrument_Serif',serif] text-[#f1f0e8] group-hover:text-[#cfd8c6] transition-colors duration-150">
                Earn fees
              </h3>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Add this stock and USDC to the Aerodrome pool.
              </p>
            </div>
            <div className="pt-2 text-xs text-[#cfd8c6] font-['IBM_Plex_Mono',monospace] flex items-center gap-1">
              <span>View Pools</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. One Screenshot-Style Panel of a Stock Row */}
      <section className="mx-auto max-w-[430px] sm:max-w-xl md:max-w-3xl lg:max-w-4xl px-2">
        <div className="rounded-xl bg-[#131511] border border-[#262923] p-4 sm:p-5">
          <div className="text-[11px] font-['IBM_Plex_Mono',monospace] text-[#8f9388] uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Official Stock Asset</span>
            <span className="text-[#6f9a72] font-semibold">1:1 Backed</span>
          </div>

          <div
            onClick={() => {
              onSelectStock(showcaseStock.symbol);
              onLaunchTerminal("desk");
            }}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[#1a1d18] border border-[#262923] hover:border-[#cfd8c6]/40 transition-all duration-150 cursor-pointer"
          >
            {/* Left: Ticker & Name */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#131511] border border-[#262923] flex items-center justify-center text-sm font-['Instrument_Serif',serif] text-[#cfd8c6] shrink-0">
                {showcaseStock.symbol.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-['IBM_Plex_Mono',monospace] font-bold text-sm text-[#f1f0e8]">
                    {showcaseStock.symbol}
                  </span>
                  <span className="text-[10px] font-['IBM_Plex_Mono',monospace] px-1.5 py-0.5 rounded bg-[#131511] border border-[#262923] text-[#8f9388]">
                    Base
                  </span>
                </div>
                <div className="text-xs text-[#8f9388] truncate">
                  {STOCKS.find((s) => s.symbol === showcaseStock.symbol)?.name ?? "NVIDIA Corp"}
                </div>
              </div>
            </div>

            {/* Right: Price, Change, Quick Trade Action */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
              <div>
                <div className="font-['IBM_Plex_Mono',monospace] font-semibold text-sm text-[#f1f0e8]">
                  ${showcaseStock.ammPrice.toFixed(2)}
                </div>
                <div
                  className={`text-xs font-['IBM_Plex_Mono',monospace] ${
                    showcaseStock.change24h >= 0 ? "text-[#6f9a72]" : "text-[#c45c4a]"
                  }`}
                >
                  {showcaseStock.change24h >= 0 ? "+" : ""}
                  {showcaseStock.change24h.toFixed(2)}%
                </div>
              </div>

              <div className="h-8 px-3 rounded bg-[#cfd8c6] text-[#0c0d0b] text-xs font-semibold flex items-center justify-center hover:bg-[#e2ead9] transition-colors duration-150">
                Trade
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="mx-auto max-w-[430px] sm:max-w-xl md:max-w-3xl lg:max-w-4xl px-2 pt-6 pb-4 border-t border-[#262923] text-center">
        <p className="text-xs text-[#8f9388] leading-relaxed font-['IBM_Plex_Sans',sans-serif]">
          Not available in the US. Not investment advice. Coinbase issues the stock. Percorium does not.
        </p>
      </footer>
    </div>
  );
};

import React, { useMemo, useState } from "react";
import {
  Sparkles,
  LineChart,
  TrendingUp,
  Layers,
  MessageSquare,
  KeyRound,
  PieChart,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { LandingPage } from "@/components/landing-page";
import { WalletModal } from "@/components/wallet-modal";
import { StockChart } from "@/components/StockChart";
import { TradeTicket } from "@/components/trade-ticket";
import { SlipstreamLpPanel } from "@/components/slipstream-lp-panel";
import { HoldersChat } from "@/components/holders-chat";
import { EligibilityChip } from "@/components/eligibility-banner";
import { StockMark } from "@/components/stock-mark";
import { CorporateActionsPanel } from "@/components/corporate-actions";
import { BaseBuilderAttribution } from "@/components/base-builder-attribution";
import { PortfolioLedger } from "@/components/portfolio-ledger";
import {
  STOCKS,
  STOCK_BY_SYMBOL,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { shortAddress } from "@/lib/percorium/format";
import { useDexBoard, usePriceBoard, quoteMap } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";
import { BasketBuilder } from "@/components/basket-builder";
import { PresetIndices } from "@/components/preset-indices";
import type { PresetBasket } from "@/lib/percorium/presets";
import type { StockPriceData } from "./types";

export type ActiveTab =
  | "overview"
  | "desk"
  | "portfolio"
  | "discover"
  | "slabs"
  | "chat";

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedSymbol, setSelectedSymbol] = useState<StockSymbol>("NVDAc");
  const [activePreset, setActivePreset] = useState<PresetBasket | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletType, setWalletType] = useState<
    "injected" | "smart_passkey" | "smart_google" | undefined
  >(undefined);

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const board = usePriceBoard();
  const dex = useDexBoard();
  const balances = useStockBalances();

  const quotes = useMemo(
    () => quoteMap(board.data?.stocks),
    [board.data?.stocks],
  );

  // Transform board and dex data into StockPriceData[] for LandingPage and Discover
  const priceBoardData: StockPriceData[] = useMemo(() => {
    return STOCKS.map((stk) => {
      const q = quotes[stk.symbol];
      const pair = dex.data?.[stk.address.toLowerCase()];
      const chainlinkPrice = q?.oracle ?? 0;
      const ammPrice = pair?.priceUsd ?? q?.amm ?? chainlinkPrice;
      const change24h = pair?.priceChange?.h24 ?? 0;
      const basisBps = q?.basisBps ?? 0;

      return {
        symbol: stk.symbol,
        name: stk.name,
        sector: stk.sector,
        token: stk.address,
        ammPrice: typeof ammPrice === "number" && !isNaN(ammPrice) ? ammPrice : 0,
        chainlinkPrice: typeof chainlinkPrice === "number" && !isNaN(chainlinkPrice) ? chainlinkPrice : 0,
        change24h: typeof change24h === "number" && !isNaN(change24h) ? change24h : 0,
        basisBps: typeof basisBps === "number" && !isNaN(basisBps) ? basisBps : 0,
      };
    });
  }, [quotes, dex.data]);

  const activeStock = STOCK_BY_SYMBOL[selectedSymbol] ?? STOCKS[0];
  const activeQuote = quotes[selectedSymbol];

  const userEffectiveUsdc = isConnected ? balances.effectiveUsdc : 0;
  const displayUserAddress = address || "";

  const handleConnectSmartWallet = (method: "passkey" | "google") => {
    setWalletType(method === "passkey" ? "smart_passkey" : "smart_google");
    const cbConnector = connectors.find(
      (c) =>
        c.id === "coinbaseWalletSDK" ||
        c.id.toLowerCase().includes("coinbase"),
    );
    if (cbConnector) {
      connect({ connector: cbConnector });
    }
  };

  const handleConnectInjected = () => {
    setWalletType("injected");
    const inj = connectors.find(
      (c) => c.id === "injected" || c.type === "injected",
    );
    if (inj) {
      connect({ connector: inj });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b09] text-[#f1f0e8] font-['IBM_Plex_Sans',sans-serif] pb-24 sm:pb-12">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#262923] bg-[#0c0d0b]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab("overview")}
              className="flex items-center gap-2 text-left transition hover:opacity-90 cursor-pointer"
            >
              <span className="font-['Instrument_Serif',serif] text-2xl tracking-tight text-[#f1f0e8]">
                Percorium
              </span>
            </button>
            <span className="rounded-full bg-[#1a1d18] border border-[#262923] px-2.5 py-0.5 text-[11px] font-medium font-['IBM_Plex_Mono',monospace] text-[#cfd8c6]">
              BASE
            </span>
          </div>

          {/* Scrollable Navigation Bar */}
          <nav className="order-3 sm:order-2 flex w-full sm:w-auto items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x py-1 sm:py-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "overview"
                  ? "bg-[#cfd8c6] text-[#0c0d0b] shadow-sm"
                  : "text-[#8f9388] hover:bg-[#1a1d18] hover:text-[#f1f0e8]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("desk")}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "desk"
                  ? "bg-[#cfd8c6] text-[#0c0d0b] shadow-sm"
                  : "text-[#8f9388] hover:bg-[#1a1d18] hover:text-[#f1f0e8]"
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Swap</span>
            </button>

            <button
              onClick={() => setActiveTab("portfolio")}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "portfolio"
                  ? "bg-[#cfd8c6] text-[#0c0d0b] shadow-sm"
                  : "text-[#8f9388] hover:bg-[#1a1d18] hover:text-[#f1f0e8]"
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Portfolio</span>
            </button>

            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "discover"
                  ? "bg-[#cfd8c6] text-[#0c0d0b] shadow-sm"
                  : "text-[#8f9388] hover:bg-[#1a1d18] hover:text-[#f1f0e8]"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab("slabs")}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "slabs"
                  ? "bg-[#cfd8c6] text-[#0c0d0b] shadow-sm"
                  : "text-[#8f9388] hover:bg-[#1a1d18] hover:text-[#f1f0e8]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Baskets</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "chat"
                  ? "bg-[#cfd8c6] text-[#0c0d0b] shadow-sm"
                  : "text-[#8f9388] hover:bg-[#1a1d18] hover:text-[#f1f0e8]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
          </nav>

          {/* Right Action Group */}
          <div className="order-2 sm:order-3 flex items-center gap-2">
            <div className="hidden md:block">
              <BaseBuilderAttribution compact />
            </div>
            <EligibilityChip />
            <button
              onClick={() => setWalletModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#262923] bg-[#1a1d18] px-3 py-1.5 text-xs font-medium font-['IBM_Plex_Mono',monospace] text-[#f1f0e8] hover:bg-[#20241e] transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#cfd8c6]" />
              <span className="max-w-[140px] sm:max-w-none truncate">
                {isConnected && address ? (
                  <span className="flex items-center gap-2">
                    <span>{shortAddress(address)}</span>
                    <span className="text-[#6f9a72] font-semibold">${balances.effectiveUsdc.toFixed(2)}</span>
                  </span>
                ) : (
                  "Connect Wallet"
                )}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        {/* Tab 1: Normie Landing Page */}
        {activeTab === "overview" && (
          <LandingPage
            priceBoard={priceBoardData}
            selectedSymbol={selectedSymbol}
            onSelectStock={(sym) => setSelectedSymbol(sym as StockSymbol)}
            onLaunchTerminal={(tab) => {
              if (tab === "desk") setActiveTab("desk");
              else if (tab === "discover") setActiveTab("discover");
              else if (tab === "slabs") setActiveTab("slabs");
              else if (tab === "lend") setActiveTab("desk");
              else if (tab === "portfolio") setActiveTab("portfolio");
            }}
            onOpenWalletModal={() => setWalletModalOpen(true)}
            onConnectOnchainKit={(method) => {
              if (method === "injected") handleConnectInjected();
              else handleConnectSmartWallet(method);
            }}
            userAddress={displayUserAddress}
            isConnected={isConnected}
            walletType={walletType}
            userBalanceUsdc={userEffectiveUsdc}
          />
        )}

        {/* Tab 2: Spot Desk (Swap Default) */}
        {activeTab === "desk" && (
          <div className="space-y-6">
            {/* Quick Stock Selector Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {STOCKS.map((stock) => {
                const quote = quotes[stock.symbol];
                const isSelected = stock.symbol === selectedSymbol;
                return (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-['IBM_Plex_Mono',monospace] whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? "bg-[#1a1d18] border-[#cfd8c6] text-[#f1f0e8] font-bold"
                        : "bg-[#131511] border-[#262923] text-[#8f9388] hover:border-[#cfd8c6]/40 hover:text-[#f1f0e8]"
                    }`}
                  >
                    <span>{stock.symbol}</span>
                    <span className="text-[#cfd8c6]">
                      ${quote?.oracle ? quote.oracle.toFixed(2) : "--"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Trading Desk Grid (Responsive with sticky ticket behavior on mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Stock Chart & Basis View */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-[#131511] border border-[#262923] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262923] pb-4">
                    <div className="flex items-center gap-3">
                      <StockMark symbol={selectedSymbol} className="size-9" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold font-['IBM_Plex_Mono',monospace] text-[#f1f0e8]">
                            {selectedSymbol}
                          </h2>
                          <span className="text-xs px-2 py-0.5 rounded bg-[#1a1d18] text-[#8f9388] border border-[#262923]">
                            {activeStock.sector}
                          </span>
                        </div>
                        <div className="text-xs text-[#8f9388]">
                          {activeStock.name} &middot; DTC 1:1 Custodied
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-['IBM_Plex_Mono',monospace]">
                      <div className="text-right">
                        <div className="text-[#8f9388]">Chainlink Price</div>
                        <div className="text-[#f1f0e8] font-bold">
                          ${activeQuote?.oracle ? activeQuote.oracle.toFixed(2) : "--"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#8f9388]">Spread</div>
                        <div className="text-[#6f9a72] font-bold">
                          {activeQuote?.basisBps !== null && activeQuote?.basisBps !== undefined
                            ? `${activeQuote.basisBps > 0 ? "+" : ""}${activeQuote.basisBps} bps`
                            : "0 bps"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Chart Component */}
                  <StockChart
                    tokenAddress={activeStock.address}
                    symbol={selectedSymbol}
                  />
                </div>
              </div>

              {/* Right: Trade Ticket (Sticky on desktop or fixed on mobile) */}
              <div className="lg:col-span-4 sticky top-16 z-30">
                <div className="bg-[#131511] border border-[#262923] rounded-xl p-4 sm:p-5 shadow-md">
                  <TradeTicket symbol={selectedSymbol} quote={activeQuote} />
                </div>
              </div>
            </div>

            {/* Aerodrome Slipstream LP for this stock (Real In-App NFPM Mint + Position Management) */}
            <div className="pt-2">
              <SlipstreamLpPanel stock={activeStock} />
            </div>

            {/* Corporate Actions & DTC 1:1 Custody Transparency (Collapsible Disclosure) */}
            <div className="pt-2">
              <CorporateActionsPanel stock={activeStock} />
            </div>
          </div>
        )}

        {/* Tab: Portfolio & Asset Ledger */}
        {activeTab === "portfolio" && (
          <PortfolioLedger
            onSelectStock={(sym) => setSelectedSymbol(sym)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Tab 3: Discover Catalog */}
        {activeTab === "discover" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
                Coinbase B20 Stock Catalog
              </h2>
              <p className="text-xs text-[#8f9388] mt-1 font-['IBM_Plex_Sans',sans-serif]">
                Official Base equity addresses with 1:1 backing at DTC.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#262923] bg-[#131511]">
              <table className="w-full text-left text-xs font-['IBM_Plex_Mono',monospace]">
                <thead className="border-b border-[#262923] bg-[#1a1d18] text-[#8f9388] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4 text-right">AMM Price</th>
                    <th className="py-3 px-4 text-right">Chainlink Price</th>
                    <th className="py-3 px-4 text-right">Spread</th>
                    <th className="py-3 px-4 text-right">24h Change</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262923]">
                  {priceBoardData.map((stk) => {
                    const isPos = stk.change24h >= 0;
                    return (
                      <tr
                        key={stk.symbol}
                        className="hover:bg-[#1a1d18]/70 transition"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#f1f0e8]">
                          <div className="flex items-center gap-2">
                            <span>{stk.symbol}</span>
                            <span className="font-normal text-[#8f9388] hidden sm:inline">
                              {stk.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#8f9388]">
                          {stk.sector}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#f1f0e8]">
                          ${stk.ammPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#cfd8c6]">
                          ${stk.chainlinkPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={
                              stk.basisBps > 150
                                ? "text-[#c4a46a] font-semibold"
                                : "text-[#6f9a72]"
                            }
                          >
                            {stk.basisBps > 0 ? `+${stk.basisBps}` : stk.basisBps} bps
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-semibold ${
                            isPos ? "text-[#6f9a72]" : "text-[#c45c4a]"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {stk.change24h.toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedSymbol(stk.symbol as StockSymbol);
                              setActiveTab("desk");
                            }}
                            className="px-3 py-1 rounded bg-[#1a1d18] hover:bg-[#cfd8c6] hover:text-[#0c0d0b] text-[#cfd8c6] border border-[#262923] text-xs font-semibold transition cursor-pointer"
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Official Shareable Stock Baskets */}
        {activeTab === "slabs" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
                Stock Baskets
              </h2>
              <p className="text-xs text-[#8f9388] mt-1 font-['IBM_Plex_Sans',sans-serif]">
                Create, share, and buy custom stock portfolios on Base.
              </p>
            </div>

            <div className="space-y-6">
              <PresetIndices
                onSelectPreset={(preset) => {
                  setActivePreset(preset);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
              />

              <BasketBuilder
                preset={activePreset}
                onSelectStock={(sym) => {
                  setSelectedSymbol(sym as StockSymbol);
                  setActiveTab("desk");
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 5: Token-Gated Holders Chat */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
                Verified Holders Chat
              </h2>
              <p className="text-xs text-[#8f9388] mt-1 font-['IBM_Plex_Sans',sans-serif]">
                Onchain chat room for verified token holders on Base.
              </p>
            </div>

            <HoldersChat
              symbol={selectedSymbol}
              onSelectStock={(sym) => setSelectedSymbol(sym as StockSymbol)}
            />
          </div>
        )}
      </main>

      {/* Wallet Connection Modal */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        userAddress={displayUserAddress}
        isConnected={isConnected}
        walletType={walletType}
        userBalanceUsdc={userEffectiveUsdc}
        onConnectInjected={handleConnectInjected}
        onConnectSmartWallet={handleConnectSmartWallet}
        onDisconnect={() => disconnect()}
      />
    </div>
  );
}

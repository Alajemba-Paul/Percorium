import React, { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  listSlabs,
  mintSlab,
  redeemSlab,
  createSlab,
  type IndexSlab,
} from "@/lib/percorium/indices";
import {
  indexNav,
  normalizeWeightsList,
  applyProtocolFee,
  sharesFromMint,
  allocateUsdcToBasket,
} from "@/lib/percorium/nav";
import {
  STOCKS,
  STOCK_BY_SYMBOL,
  type StockSymbol,
} from "@/lib/percorium/constants";
import { formatUsd } from "@/lib/percorium/format";
import { usePriceBoard, quoteMap } from "@/hooks/use-board";

interface IndexWorkshopProps {
  userEffectiveUsdc: number;
  isConnected: boolean;
  onOpenWalletModal: () => void;
  onTradeStock: (symbol: StockSymbol) => void;
}

export const IndexWorkshop: React.FC<IndexWorkshopProps> = ({
  userEffectiveUsdc,
  isConnected,
  onOpenWalletModal: _onOpenWalletModal,
  onTradeStock,
}) => {
  const [slabs, setSlabs] = useState<IndexSlab[]>(() => listSlabs());
  const [activeActionSlabId, setActiveActionSlabId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"mint" | "redeem">("mint");
  const [depositUsdc, setDepositUsdc] = useState<string>("500");
  const [redeemShares, setRedeemShares] = useState<string>("5");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New index form state
  const [newIndexName, setNewIndexName] = useState("");
  const [newIndexSymbol, setNewIndexSymbol] = useState("");
  const [selectedStocks, setSelectedStocks] = useState<StockSymbol[]>([
    "NVDAc",
    "MSFTc",
    "AAPLc",
  ]);
  const [stockWeights, setStockWeights] = useState<Record<string, number>>({
    NVDAc: 40,
    MSFTc: 35,
    AAPLc: 25,
  });

  const board = usePriceBoard();
  const quotes = useMemo(
    () => quoteMap(board.data?.stocks),
    [board.data?.stocks],
  );

  const pricesMap = useMemo(() => {
    return Object.fromEntries(
      Object.entries(quotes).map(([k, v]) => [k, v.oracle]),
    ) as Partial<Record<StockSymbol, number>>;
  }, [quotes]);

  const refreshSlabs = () => {
    setSlabs(listSlabs());
  };

  const activeSlab = useMemo(() => {
    if (!activeActionSlabId) return null;
    return slabs.find((s) => s.id === activeActionSlabId) ?? null;
  }, [activeActionSlabId, slabs]);

  const activeSlabNav = useMemo(() => {
    if (!activeSlab) return 1.0;
    return indexNav({
      inventory: activeSlab.inventory,
      prices: pricesMap,
      cashUsdc: activeSlab.cashUsdc,
      supply: activeSlab.supply,
    });
  }, [activeSlab, pricesMap]);

  // Mint math
  const depositNum = parseFloat(depositUsdc) || 0;
  const { fee: mintFee, net: netDeposit } = applyProtocolFee(
    depositNum,
    activeSlab?.feeBps ?? 30,
  );
  const estimatedMintShares = sharesFromMint(netDeposit, activeSlabNav);
  const mintFills = useMemo(() => {
    if (!activeSlab || depositNum <= 0) return [];
    return allocateUsdcToBasket(netDeposit, activeSlab.weights, pricesMap);
  }, [activeSlab, depositNum, netDeposit, pricesMap]);

  // Redeem math
  const redeemNum = parseFloat(redeemShares) || 0;
  const estimatedRedeemUsdc = redeemNum * activeSlabNav;

  const handleExecuteMint = () => {
    if (!activeSlab) return;
    if (depositNum <= 0) {
      toast.error("Please enter a valid USDC amount.");
      return;
    }
    if (isConnected && userEffectiveUsdc < depositNum) {
      toast.error(`Insufficient USDC balance ($${userEffectiveUsdc.toFixed(2)} available).`);
      return;
    }

    try {
      const updated = mintSlab(activeSlab.id, depositNum, pricesMap);
      if (updated) {
        refreshSlabs();
        toast.success(
          `Successfully minted ${estimatedMintShares.toFixed(2)} ${activeSlab.symbol} shares!`,
        );
        setActiveActionSlabId(null);
        setDepositUsdc("500");
      }
    } catch {
      toast.error("Failed to execute mint transaction.");
    }
  };

  const handleExecuteRedeem = () => {
    if (!activeSlab) return;
    if (redeemNum <= 0) {
      toast.error("Please enter a valid share quantity.");
      return;
    }
    if (redeemNum > activeSlab.supply) {
      toast.error(`Cannot redeem more than total vault supply (${activeSlab.supply.toFixed(2)} shares).`);
      return;
    }

    try {
      const updated = redeemSlab(activeSlab.id, redeemNum, true, pricesMap);
      if (updated) {
        refreshSlabs();
        toast.success(
          `Successfully redeemed ${redeemNum.toFixed(2)} ${activeSlab.symbol} shares for ~$${estimatedRedeemUsdc.toFixed(2)} USDC.`,
        );
        setActiveActionSlabId(null);
        setRedeemShares("5");
      }
    } catch {
      toast.error("Failed to execute redeem transaction.");
    }
  };

  // Create custom slab
  const totalCustomWeight = useMemo(() => {
    return selectedStocks.reduce((sum, sym) => sum + (stockWeights[sym] ?? 0), 0);
  }, [selectedStocks, stockWeights]);

  const handleCreateNewSlab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndexName.trim()) {
      toast.error("Please provide an index name.");
      return;
    }
    if (!newIndexSymbol.trim()) {
      toast.error("Please provide a ticker symbol (e.g. SEMI).");
      return;
    }
    if (selectedStocks.length === 0) {
      toast.error("Please select at least one stock component.");
      return;
    }
    if (totalCustomWeight !== 100) {
      toast.error(`Weights must sum to exactly 100% (currently ${totalCustomWeight}%).`);
      return;
    }

    const weights: Partial<Record<StockSymbol, number>> = {};
    for (const sym of selectedStocks) {
      weights[sym] = stockWeights[sym] ?? 0;
    }

    try {
      const created = createSlab({
        name: newIndexName,
        symbol: newIndexSymbol,
        creator: isConnected ? "Verified Account" : "Percorium Workshop",
        weights,
      });

      refreshSlabs();
      setIsCreateModalOpen(false);
      setNewIndexName("");
      setNewIndexSymbol("");
      toast.success(`Created index vault ${created.symbol} (${created.name})!`);
    } catch {
      toast.error("Could not create index slab.");
    }
  };

  return (
    <div className="space-y-6 font-['IBM_Plex_Sans',sans-serif]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262923]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
              Stock Baskets
            </h2>
            <span className="rounded bg-[#1a1d18] border border-[#262923] px-2 py-0.5 text-[11px] font-medium font-['IBM_Plex_Mono',monospace] text-[#6f9a72]">
              REAL STOCKS
            </span>
          </div>
          <p className="text-xs text-[#8f9388] mt-1 max-w-2xl leading-relaxed">
            Fully backed stock baskets on Base. Each basket holds real Coinbase stocks and USDC cash.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#cfd8c6] hover:bg-[#b8c3af] text-[#0c0d0b] text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Basket</span>
          </button>
        </div>
      </div>

      {/* Index Slabs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {slabs.map((slab) => {
          const nav = indexNav({
            inventory: slab.inventory,
            prices: pricesMap,
            cashUsdc: slab.cashUsdc,
            supply: slab.supply,
          });
          const weightList = normalizeWeightsList(slab.weights);
          const totalAssetsUsdc = slab.supply > 0 ? nav * slab.supply : slab.cashUsdc;

          return (
            <div
              key={slab.id}
              className="p-5 sm:p-6 bg-[#131511] border border-[#262923] rounded-xl flex flex-col justify-between space-y-5 hover:border-[#33372f] transition"
            >
              {/* Top info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    <span>{slab.symbol}</span>
                    <span>&middot;</span>
                    <span>ERC-4626 Standard</span>
                  </div>
                  <h3 className="text-2xl font-['Instrument_Serif',serif] text-[#f1f0e8] mt-0.5">
                    {slab.name}
                  </h3>
                  <div className="text-[11px] text-[#8f9388] font-['IBM_Plex_Mono',monospace] mt-1 flex items-center gap-2">
                    <span>Creator: {slab.creator}</span>
                    <span>&middot;</span>
                    <span>Max Loan: {slab.maxLtvBps / 100}%</span>
                  </div>
                </div>

                <div className="text-right font-['IBM_Plex_Mono',monospace]">
                  <div className="text-[11px] text-[#8f9388]">Basket Value</div>
                  <div className="text-xl font-bold text-[#6f9a72]">
                    ${nav.toFixed(2)} <span className="text-xs font-normal text-[#cfd8c6]">USDC</span>
                  </div>
                  <div className="text-[10px] text-[#8f9388]">
                    Supply: {slab.supply.toLocaleString()} shares
                  </div>
                </div>
              </div>

              {/* Composition Weight Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-['IBM_Plex_Mono',monospace] text-[#8f9388]">
                  <span>Target Basket Composition</span>
                  <span>{weightList.length} Stocks &middot; 100% Backed</span>
                </div>

                {/* Progress bar representing weights */}
                <div className="w-full h-2 rounded-full overflow-hidden bg-[#1a1d18] flex">
                  {weightList.map((item, idx) => {
                    const colors = [
                      "bg-[#6f9a72]",
                      "bg-[#c4a46a]",
                      "bg-[#7a9ec2]",
                      "bg-[#a48ec4]",
                      "bg-[#c2847a]",
                    ];
                    return (
                      <div
                        key={item.symbol}
                        className={`${colors[idx % colors.length]} h-full transition-all`}
                        style={{ width: `${item.pct}%` }}
                        title={`${item.symbol}: ${item.pct}%`}
                      />
                    );
                  })}
                </div>

                {/* Stock Chips Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {weightList.map((item) => {
                    const stock = STOCK_BY_SYMBOL[item.symbol];
                    const px = pricesMap[item.symbol] ?? 0;
                    return (
                      <button
                        key={item.symbol}
                        onClick={() => onTradeStock(item.symbol)}
                        className="p-2 rounded-lg bg-[#1a1d18] border border-[#262923] hover:border-[#cfd8c6]/40 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#f1f0e8] font-['IBM_Plex_Mono',monospace] group-hover:text-[#6f9a72] transition">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] font-semibold text-[#cfd8c6] font-['IBM_Plex_Mono',monospace]">
                            {item.pct}%
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8f9388] truncate mt-0.5">
                          {stock?.name ?? item.symbol}
                        </div>
                        <div className="text-[10px] text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                          ${px.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vault Metric Summary */}
              <div className="p-3 bg-[#1a1d18] rounded-lg border border-[#262923] flex items-center justify-between text-xs font-['IBM_Plex_Mono',monospace]">
                <div>
                  <div className="text-[10px] text-[#8f9388]">Basket Assets</div>
                  <div className="text-[#f1f0e8] font-semibold">
                    {formatUsd(totalAssetsUsdc)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8f9388]">USDC Cash</div>
                  <div className="text-[#cfd8c6]">
                    ${slab.cashUsdc.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8f9388]">Fee</div>
                  <div className="text-[#6f9a72]">
                    {(slab.feeBps / 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#262923]">
                <div className="text-[11px] font-['IBM_Plex_Mono',monospace] text-[#8f9388] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6f9a72]" />
                  <span>Isolated risk &middot; No risk from other assets</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveActionSlabId(slab.id);
                      setActionType("redeem");
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#262923] bg-[#1a1d18] hover:bg-[#20241e] text-[#cfd8c6] text-xs font-medium transition cursor-pointer"
                  >
                    Redeem Shares
                  </button>

                  <button
                    onClick={() => {
                      setActiveActionSlabId(slab.id);
                      setActionType("mint");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#cfd8c6] hover:bg-[#b8c3af] text-[#0c0d0b] text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <span>Mint Shares</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Drawer / Modal for Mint & Redeem */}
      {activeSlab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#131511] border border-[#262923] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#262923] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
                    {actionType === "mint" ? "Mint Basket Shares" : "Redeem Basket Shares"}
                  </h3>
                  <p className="text-[11px] text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    {activeSlab.name} ({activeSlab.symbol}) &middot; Basket Value ${activeSlabNav.toFixed(2)} USDC
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveActionSlabId(null)}
                className="text-[#8f9388] hover:text-[#f1f0e8] text-lg leading-none transition cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Action Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-[#1a1d18] p-1 rounded-lg border border-[#262923]">
              <button
                onClick={() => setActionType("mint")}
                className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  actionType === "mint"
                    ? "bg-[#cfd8c6] text-[#0c0d0b]"
                    : "text-[#8f9388] hover:text-[#f1f0e8]"
                }`}
              >
                Deposit USDC &amp; Mint
              </button>
              <button
                onClick={() => setActionType("redeem")}
                className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  actionType === "redeem"
                    ? "bg-[#cfd8c6] text-[#0c0d0b]"
                    : "text-[#8f9388] hover:text-[#f1f0e8]"
                }`}
              >
                Redeem for USDC
              </button>
            </div>

            {actionType === "mint" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    <span>Deposit USDC</span>
                    <span>Available: ${userEffectiveUsdc.toFixed(2)} USDC</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="10"
                      value={depositUsdc}
                      onChange={(e) => setDepositUsdc(e.target.value)}
                      placeholder="500"
                      className="w-full bg-[#1a1d18] border border-[#262923] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f0e8] font-['IBM_Plex_Mono',monospace] focus:outline-none focus:border-[#cfd8c6]"
                    />
                    <button
                      onClick={() => setDepositUsdc(userEffectiveUsdc > 0 ? userEffectiveUsdc.toString() : "1000")}
                      className="absolute right-2 top-2 px-2 py-1 bg-[#262923] hover:bg-[#33372f] text-[10px] font-bold text-[#cfd8c6] rounded font-['IBM_Plex_Mono',monospace] cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Mint preview details */}
                <div className="p-3 bg-[#1a1d18] rounded-lg border border-[#262923] space-y-2 text-xs font-['IBM_Plex_Mono',monospace]">
                  <div className="flex justify-between text-[#8f9388]">
                    <span>Basket Share Value:</span>
                    <span className="text-[#f1f0e8]">${activeSlabNav.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-[#8f9388]">
                    <span>Fee ({(activeSlab.feeBps / 100).toFixed(2)}%):</span>
                    <span className="text-[#c4a46a]">-${mintFee.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-[#8f9388]">
                    <span>Net Deposit:</span>
                    <span className="text-[#f1f0e8]">${netDeposit.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-[#8f9388] pt-1 border-t border-[#262923]">
                    <span className="font-semibold text-[#cfd8c6]">Estimated {activeSlab.symbol} Shares:</span>
                    <span className="text-[#6f9a72] font-bold text-sm">
                      {estimatedMintShares.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Underlying buy allocation */}
                <div className="space-y-1">
                  <div className="text-[11px] text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    Stock Allocation:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-['IBM_Plex_Mono',monospace]">
                    {mintFills.map((fill) => (
                      <div
                        key={fill.symbol}
                        className="p-1.5 rounded bg-[#131511] border border-[#262923] flex justify-between"
                      >
                        <span className="text-[#cfd8c6]">{fill.symbol}</span>
                        <span className="text-[#6f9a72]">${fill.usdc.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExecuteMint}
                  className="w-full py-3 bg-[#cfd8c6] hover:bg-[#b8c3af] text-[#0c0d0b] font-semibold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mint {activeSlab.symbol} Shares</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    <span>Shares to Redeem</span>
                    <span>Total Supply: {activeSlab.supply.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={redeemShares}
                    onChange={(e) => setRedeemShares(e.target.value)}
                    placeholder="10"
                    className="w-full bg-[#1a1d18] border border-[#262923] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f0e8] font-['IBM_Plex_Mono',monospace] focus:outline-none focus:border-[#cfd8c6]"
                  />
                </div>

                <div className="p-3 bg-[#1a1d18] rounded-lg border border-[#262923] space-y-2 text-xs font-['IBM_Plex_Mono',monospace]">
                  <div className="flex justify-between text-[#8f9388]">
                    <span>Basket Value:</span>
                    <span className="text-[#f1f0e8]">${activeSlabNav.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-[#8f9388]">
                    <span>Redemption Proceeds:</span>
                    <span className="text-[#6f9a72] font-bold text-sm">
                      ~${estimatedRedeemUsdc.toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExecuteRedeem}
                  className="w-full py-3 bg-[#1a1d18] hover:bg-[#20241e] border border-[#262923] text-[#f1f0e8] font-semibold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Redeem Shares</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Custom Slab Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['IBM_Plex_Sans',sans-serif]">
          <div className="bg-[#131511] border border-[#262923] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#262923] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
                    Create Stock Basket
                  </h3>
                  <p className="text-[11px] text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    Pick Coinbase stocks and set percentage weights.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#8f9388] hover:text-[#f1f0e8] text-lg leading-none transition cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSlab} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    Basket Name
                  </label>
                  <input
                    type="text"
                    value={newIndexName}
                    onChange={(e) => setNewIndexName(e.target.value)}
                    placeholder="e.g. Semiconductor Alpha"
                    className="w-full bg-[#1a1d18] border border-[#262923] rounded-lg px-3 py-2 text-xs text-[#f1f0e8] focus:outline-none focus:border-[#cfd8c6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    value={newIndexSymbol}
                    onChange={(e) => setNewIndexSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. SEMI"
                    maxLength={8}
                    className="w-full bg-[#1a1d18] border border-[#262923] rounded-lg px-3 py-2 text-xs text-[#f1f0e8] font-['IBM_Plex_Mono',monospace] focus:outline-none focus:border-[#cfd8c6]"
                  />
                </div>
              </div>

              {/* Equities Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-['IBM_Plex_Mono',monospace]">
                  <span className="text-[#8f9388]">Select Underlying Stocks:</span>
                  <span
                    className={
                      totalCustomWeight === 100
                        ? "text-[#6f9a72] font-bold"
                        : "text-[#c4a46a] font-bold"
                    }
                  >
                    Weight Sum: {totalCustomWeight}% / 100%
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {STOCKS.map((stock) => {
                    const isChecked = selectedStocks.includes(stock.symbol);
                    const weight = stockWeights[stock.symbol] ?? 0;

                    return (
                      <div
                        key={stock.symbol}
                        className={`p-2.5 rounded-lg border flex items-center justify-between transition ${
                          isChecked
                            ? "bg-[#1a1d18] border-[#33372f]"
                            : "bg-[#131511] border-[#262923] opacity-60"
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStocks([...selectedStocks, stock.symbol]);
                                if (!stockWeights[stock.symbol]) {
                                  setStockWeights({
                                    ...stockWeights,
                                    [stock.symbol]: 20,
                                  });
                                }
                              } else {
                                setSelectedStocks(
                                  selectedStocks.filter((s) => s !== stock.symbol),
                                );
                              }
                            }}
                            className="rounded border-[#262923] text-[#cfd8c6] focus:ring-0"
                          />
                          <div>
                            <div className="text-xs font-bold text-[#f1f0e8] font-['IBM_Plex_Mono',monospace]">
                              {stock.symbol}
                            </div>
                            <div className="text-[10px] text-[#8f9388]">
                              {stock.name} &middot; {stock.sector}
                            </div>
                          </div>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={weight}
                              onChange={(e) =>
                                setStockWeights({
                                  ...stockWeights,
                                  [stock.symbol]: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-16 bg-[#131511] border border-[#262923] rounded px-2 py-1 text-xs text-right font-['IBM_Plex_Mono',monospace] text-[#f1f0e8]"
                            />
                            <span className="text-xs text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#262923] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#262923] text-xs font-medium text-[#8f9388] hover:text-[#f1f0e8] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={totalCustomWeight !== 100}
                  className="px-4 py-2 rounded-lg bg-[#cfd8c6] hover:bg-[#b8c3af] disabled:opacity-40 disabled:cursor-not-allowed text-[#0c0d0b] text-xs font-semibold transition cursor-pointer"
                >
                  Create Basket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

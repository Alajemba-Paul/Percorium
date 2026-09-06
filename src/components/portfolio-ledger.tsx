import React, { useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  Share2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockMark } from "@/components/stock-mark";
import {
  STOCKS,
  type StockSymbol,
  BASE_BUILDER_CODE,
} from "@/lib/percorium/constants";
import { formatNum, formatUsd } from "@/lib/percorium/format";
import { usePriceBoard, quoteMap, useDexBoard } from "@/hooks/use-board";
import { useStockBalances } from "@/hooks/use-balances";

interface PortfolioLedgerProps {
  onSelectStock?: (symbol: StockSymbol) => void;
  onNavigateTab?: (tab: "desk" | "discover" | "slabs") => void;
}

export function PortfolioLedger({
  onSelectStock,
  onNavigateTab,
}: PortfolioLedgerProps) {
  const board = usePriceBoard();
  const dex = useDexBoard();
  const balances = useStockBalances();

  const quotes = useMemo(
    () => quoteMap(board.data?.stocks),
    [board.data?.stocks],
  );

  // 1. Calculate holding positions
  const holdings = useMemo(() => {
    return STOCKS.map((stock) => {
      const holding = balances.stocks?.[stock.symbol] ?? { raw: "0", units: 0 };
      const units = holding.units;
      const quote = quotes[stock.symbol];
      const dexPair = dex.data?.[stock.address.toLowerCase()];

      const oraclePrice = quote?.oracle ?? 0;
      const ammPrice = dexPair?.priceUsd ?? quote?.amm ?? oraclePrice;
      const price = oraclePrice > 0 ? oraclePrice : ammPrice;

      const valueUsd = units * price;
      const change24h = dexPair?.priceChange?.h24 ?? 0;
      const pnl24hUsd = valueUsd * (change24h / 100);

      return {
        stock,
        units,
        price,
        valueUsd,
        change24h,
        pnl24hUsd,
      };
    }).filter((h) => h.units > 0);
  }, [balances.stocks, quotes, dex.data]);

  const usdcBalance = balances.effectiveUsdc;
  const totalStockValueUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  const totalPortfolioNav = usdcBalance + totalStockValueUsd;

  const total24hPnlUsd = holdings.reduce((sum, h) => sum + h.pnl24hUsd, 0);
  const total24hPnlPct =
    totalPortfolioNav > 0 ? (total24hPnlUsd / totalPortfolioNav) * 100 : 0;

  // Sector allocation
  const sectorAllocation = useMemo(() => {
    const map: Record<string, number> = { USDC: usdcBalance };
    holdings.forEach((h) => {
      const s = h.stock.sector || "Other";
      map[s] = (map[s] || 0) + h.valueUsd;
    });
    return Object.entries(map).map(([sector, amount]) => ({
      sector,
      amount,
      pct: totalPortfolioNav > 0 ? (amount / totalPortfolioNav) * 100 : 0,
    }));
  }, [holdings, usdcBalance, totalPortfolioNav]);

  const exportLedgerCsv = () => {
    const rows = [
      ["Asset", "Symbol", "Contract Address", "Units", "Oracle NAV ($)", "Total USD Value", "24h Change (%)"],
      ["USDC", "USDC", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", usdcBalance.toFixed(2), "1.00", usdcBalance.toFixed(2), "0.00%"],
      ...holdings.map((h) => [
        h.stock.name,
        h.stock.symbol,
        h.stock.address,
        h.units.toString(),
        h.price.toFixed(2),
        h.valueUsd.toFixed(2),
        `${h.change24h.toFixed(2)}%`,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `percorium_portfolio_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Portfolio ledger exported successfully.");
  };

  const shareToWarpcast = () => {
    const text = encodeURIComponent(
      `📊 My Percorium Portfolio NAV on @base: ${formatUsd(totalPortfolioNav)}\n\n` +
      `Holdings: ${holdings.length} Coinbase B20 tokenized stocks + USDC\n` +
      `⚡ Base Builder: ${BASE_BUILDER_CODE}\n\nhttps://percorium.vercel.app`
    );
    window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank");
  };

  return (
    <div className="rounded-xl bg-[#131511] border border-[#262923] p-5 shadow-sm space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#262923] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
              Portfolio NAV &amp; Asset Ledger
            </h2>
            <Badge className="bg-[#1a1d18] border-[#262923] text-[#cfd8c6] text-[10px] font-mono">
              Live Onchain
            </Badge>
          </div>
          <p className="text-xs text-[#8f9388] mt-0.5">
            Direct wallet balances of official Coinbase B20 tokenized equities and USDC on Base.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportLedgerCsv}
            className="border-[#262923] bg-[#1a1d18] text-[#f1f0e8] hover:bg-[#20241e] text-xs h-8"
          >
            <Download className="size-3.5 mr-1 text-[#cfd8c6]" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={shareToWarpcast}
            className="bg-[#472a91] hover:bg-[#5b38b8] text-white text-xs h-8 px-3"
          >
            <Share2 className="size-3.5 mr-1" />
            Share NAV
          </Button>
        </div>
      </div>

      {/* Primary KPI Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#1a1d18] border border-[#262923] p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
            Total Net Asset Value
          </div>
          <div className="mt-1 font-['IBM_Plex_Mono',monospace] text-2xl font-bold text-[#f1f0e8] tabular-nums">
            {formatUsd(totalPortfolioNav)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {total24hPnlUsd >= 0 ? (
              <span className="flex items-center gap-0.5 text-emerald-400 font-mono">
                <TrendingUp className="size-3" />
                +{formatUsd(total24hPnlUsd)} (+{total24hPnlPct.toFixed(2)}%) 24h
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-red-400 font-mono">
                <TrendingDown className="size-3" />
                {formatUsd(total24hPnlUsd)} ({total24hPnlPct.toFixed(2)}%) 24h
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[#1a1d18] border border-[#262923] p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
            Equities Holding Value
          </div>
          <div className="mt-1 font-['IBM_Plex_Mono',monospace] text-2xl font-bold text-[#cfd8c6] tabular-nums">
            {formatUsd(totalStockValueUsd)}
          </div>
          <div className="mt-1 text-xs text-[#8f9388]">
            {holdings.length} {holdings.length === 1 ? "position" : "positions"} active
          </div>
        </div>

        <div className="rounded-xl bg-[#1a1d18] border border-[#262923] p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
            Available USDC Cash
          </div>
          <div className="mt-1 font-['IBM_Plex_Mono',monospace] text-2xl font-bold text-[#f1f0e8] tabular-nums">
            {formatUsd(usdcBalance)}
          </div>
          <div className="mt-1 text-xs text-[#8f9388] font-mono">
            Settled Base Native USDC
          </div>
        </div>
      </div>

      {/* Allocation Visualizer Bar */}
      <div className="rounded-xl bg-[#1a1d18] border border-[#262923] p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-['IBM_Plex_Mono',monospace] text-[#cfd8c6] font-medium">
            Asset &amp; Sector Allocation
          </span>
          <span className="text-[#8f9388]">
            100% Onchain Direct Custody
          </span>
        </div>

        {/* Multi-color segment bar */}
        <div className="h-3 w-full rounded-full bg-[#131511] overflow-hidden flex">
          {sectorAllocation.map((sec, idx) => {
            const colors = [
              "bg-[#0052FF]",
              "bg-[#cfd8c6]",
              "bg-[#6f9a72]",
              "bg-[#e5a957]",
              "bg-[#a78bfa]",
              "bg-[#f43f5e]",
            ];
            const color = colors[idx % colors.length];
            return sec.pct > 0 ? (
              <div
                key={sec.sector}
                style={{ width: `${sec.pct}%` }}
                className={`${color} h-full transition-all duration-300`}
                title={`${sec.sector}: ${sec.pct.toFixed(1)}% (${formatUsd(sec.amount)})`}
              />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          {sectorAllocation.map((sec, idx) => {
            const colors = [
              "bg-[#0052FF]",
              "bg-[#cfd8c6]",
              "bg-[#6f9a72]",
              "bg-[#e5a957]",
              "bg-[#a78bfa]",
              "bg-[#f43f5e]",
            ];
            const color = colors[idx % colors.length];
            return (
              <div key={sec.sector} className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className={`size-2 rounded-full ${color}`} />
                <span className="text-[#8f9388]">{sec.sector}:</span>
                <span className="text-[#f1f0e8] font-semibold">{sec.pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holdings Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-['Instrument_Serif',serif] text-[#f1f0e8]">
            Stock Holdings Ledger
          </h3>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("discover")}
              className="text-xs text-[#cfd8c6] hover:underline flex items-center gap-1 font-mono"
            >
              <span>Explore All Stocks</span>
              <ArrowUpRight className="size-3" />
            </button>
          )}
        </div>

        {holdings.length === 0 ? (
          <div className="rounded-xl bg-[#1a1d18] border border-[#262923] p-8 text-center space-y-3">
            <div className="size-10 rounded-full bg-[#131511] border border-[#262923] flex items-center justify-center mx-auto text-[#8f9388]">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#f1f0e8]">No stock holdings yet</p>
              <p className="text-xs text-[#8f9388] mt-1 max-w-sm mx-auto">
                Buy official Coinbase B20 tokenized stocks or mint custom stock baskets to see your portfolio ledger update here in real-time.
              </p>
            </div>
            {onNavigateTab && (
              <Button
                size="sm"
                onClick={() => onNavigateTab("discover")}
                className="bg-[#cfd8c6] text-[#0c0d0b] hover:bg-[#b8c2af] text-xs font-semibold"
              >
                Discover Stocks
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#262923]">
            <table className="w-full text-left text-xs font-['IBM_Plex_Mono',monospace]">
              <thead className="bg-[#1a1d18] border-b border-[#262923] text-[#8f9388]">
                <tr>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Units Held</th>
                  <th className="py-2.5 px-3">Oracle NAV</th>
                  <th className="py-2.5 px-3">Value (USD)</th>
                  <th className="py-2.5 px-3">24h Gain/Loss</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262923] bg-[#131511]">
                {holdings.map((h) => (
                  <tr key={h.stock.symbol} className="hover:bg-[#1a1d18]/50 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <StockMark symbol={h.stock.symbol} size="sm" />
                        <div>
                          <div className="font-bold text-[#f1f0e8]">{h.stock.symbol}</div>
                          <div className="text-[10px] text-[#8f9388] font-sans">{h.stock.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums text-[#f1f0e8] font-medium">
                      {formatNum(h.units, 4)}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-[#cfd8c6]">
                      {formatUsd(h.price)}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-[#f1f0e8] font-semibold">
                      {formatUsd(h.valueUsd)}
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {h.pnl24hUsd >= 0 ? (
                        <span className="text-emerald-400">
                          +{formatUsd(h.pnl24hUsd)} (+{h.change24h.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-red-400">
                          {formatUsd(h.pnl24hUsd)} ({h.change24h.toFixed(2)}%)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectStock && onNavigateTab && (
                          <button
                            onClick={() => {
                              onSelectStock(h.stock.symbol);
                              onNavigateTab("desk");
                            }}
                            className="px-2 py-1 rounded bg-[#1a1d18] hover:bg-[#22271f] text-[11px] text-[#cfd8c6] border border-[#262923] transition cursor-pointer"
                          >
                            Trade
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

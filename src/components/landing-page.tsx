/**
 * Percorium Landing Page & Interactive Overview
 * Institutional Terminal Style with Motion Animations & Mobile Optimization
 */

import React, { useState } from 'react';
import {
  LineChart,
  Layers,
  Coins,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  KeyRound,
  UserCheck,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { StockPriceData } from '../types';

interface LandingPageProps {
  priceBoard: StockPriceData[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  onLaunchTerminal: (tab: 'desk' | 'discover' | 'slabs' | 'lend' | 'portfolio') => void;
  onOpenWalletModal: () => void;
  onConnectOnchainKit: (method: 'passkey' | 'google' | 'injected') => void;
  userAddress: string;
  isConnected: boolean;
  walletType?: 'injected' | 'smart_passkey' | 'smart_google';
  userBalanceUsdc: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  priceBoard,
  selectedSymbol,
  onSelectStock,
  onLaunchTerminal,
  onOpenWalletModal,
  onConnectOnchainKit,
  userAddress,
  isConnected,
  walletType: _walletType,
  userBalanceUsdc,
}) => {
  const [socialEmailInput, setSocialEmailInput] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [_hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  const spotlightSymbols = ['NVDAc', 'COINc', 'AAPLc', 'TSLAc', 'MSTRc', 'MSFTc'];
  const spotlightStocks = spotlightSymbols
    .map((sym) => priceBoard.find((p) => p.symbol === sym))
    .filter(Boolean) as StockPriceData[];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialEmailInput || !socialEmailInput.includes('@')) return;
    setIsSubmittingEmail(true);
    setTimeout(() => {
      onConnectOnchainKit('google');
      setIsSubmittingEmail(false);
      setSocialEmailInput('');
    }, 600);
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-12 font-['IBM_Plex_Sans',sans-serif]">
      {/* 1. Live Continuous Ticker Ribbon */}
      <div className="border-y border-[#262923] bg-[#0c0d0b] -mx-4 px-4 py-2.5 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="flex items-center gap-4 sm:gap-6 min-w-max">
          <div className="flex items-center gap-1.5 text-[11px] font-['IBM_Plex_Mono',monospace] text-[#8f9388] uppercase tracking-wider pr-3 border-r border-[#262923]">
            <span className="w-2 h-2 rounded-full bg-[#6f9a72] animate-pulse"></span>
            <span>Live Coinbase Stocks</span>
          </div>
          {priceBoard.map((stk) => {
            const isPos = stk.change24h >= 0;
            return (
              <button
                key={stk.symbol}
                onClick={() => {
                  onSelectStock(stk.symbol);
                  onLaunchTerminal('desk');
                }}
                className="flex items-center gap-2 hover:bg-[#1a1d18] active:scale-95 px-2 py-1 rounded transition text-xs font-['IBM_Plex_Mono',monospace] cursor-pointer"
              >
                <span className="font-bold text-[#f1f0e8]">{stk.symbol}</span>
                <span className="text-[#cfd8c6]">${stk.ammPrice.toFixed(2)}</span>
                <span className={`text-[11px] font-medium ${isPos ? 'text-[#6f9a72]' : 'text-[#c45c4a]'}`}>
                  {isPos ? '+' : ''}{stk.change24h.toFixed(2)}%
                </span>
                <span className="text-[10px] text-[#8f9388] px-1 py-0.5 rounded bg-[#131511] border border-[#262923]">
                  {stk.basisBps > 0 ? `+${stk.basisBps} bps` : `${stk.basisBps} bps`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Hero Section: Terminal Aesthetic Header */}
      <div className="relative rounded-2xl bg-[#131511] border border-[#262923] p-5 sm:p-10 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(#262923_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1d18] border border-[#262923] text-xs font-['IBM_Plex_Mono',monospace]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6f9a72]"></span>
            <span className="text-[#cfd8c6]">Base Stock Platform</span>
            <span className="text-[#8f9388]">·</span>
            <span className="text-[#8f9388] truncate max-w-[150px] sm:max-w-none">Real Shares Held by Coinbase</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-['Instrument_Serif',serif] tracking-tight text-[#f1f0e8] leading-[1.12]">
            Official Coinbase Tokenized Stocks
          </h1>

          <p className="text-sm sm:text-base text-[#8f9388] max-w-2xl leading-relaxed">
            Trade, build stock baskets, and borrow against official tokenized stocks on Base. Each token is matched to a real share held by Coinbase. All trades settle in USDC.
          </p>

          {/* Interactive Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={() => onLaunchTerminal('desk')}
              className="h-11 px-6 bg-[#cfd8c6] hover:bg-[#b8c3af] active:scale-[0.98] text-[#0c0d0b] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
            >
              <span>Trade Spot</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenWalletModal}
              className="h-11 px-5 bg-[#1a1d18] hover:bg-[#20241e] active:scale-[0.98] text-[#f1f0e8] border border-[#262923] rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition font-['IBM_Plex_Mono',monospace] cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-[#cfd8c6]" />
              <span>
                {isConnected && userAddress
                  ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)} ($${userBalanceUsdc.toFixed(2)} USDC)`
                  : 'Connect Wallet'}
              </span>
            </button>

            <button
              onClick={() => onLaunchTerminal('slabs')}
              className="h-11 px-4 text-[#8f9388] hover:text-[#f1f0e8] text-xs font-medium flex items-center justify-center gap-1.5 transition font-['IBM_Plex_Mono',monospace] cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stock Baskets</span>
            </button>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-[#262923] font-['IBM_Plex_Mono',monospace]">
            <div>
              <div className="text-[11px] text-[#8f9388]">Settlement Asset</div>
              <div className="text-xs sm:text-sm font-semibold text-[#f1f0e8]">USDC on Base</div>
            </div>
            <div>
              <div className="text-[11px] text-[#8f9388]">Official List</div>
              <div className="text-xs sm:text-sm font-semibold text-[#cfd8c6]">0x3f3E...5CaD</div>
            </div>
            <div>
              <div className="text-[11px] text-[#8f9388]">Price Guard</div>
              <div className="text-xs sm:text-sm font-semibold text-[#6f9a72]">Blocks bad price gaps</div>
            </div>
            <div>
              <div className="text-[11px] text-[#8f9388]">Borrowing Facility</div>
              <div className="text-xs sm:text-sm font-semibold text-[#f1f0e8]">Morpho Blue (77% Max Loan)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Stocks at a Glance Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-['Instrument_Serif',serif] text-[#f1f0e8] flex items-center gap-2">
              <span>Coinbase Stocks at a Glance</span>
            </h2>
            <p className="text-xs text-[#8f9388]">
              Live prices, official price feeds, and price gaps for official Coinbase stocks.
            </p>
          </div>
          <button
            onClick={() => onLaunchTerminal('discover')}
            className="text-xs text-[#cfd8c6] hover:underline flex items-center gap-1 font-['IBM_Plex_Mono',monospace] cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {spotlightStocks.map((stock) => {
            const isPos = stock.change24h >= 0;
            const isSelected = selectedSymbol === stock.symbol;

            return (
              <div
                key={stock.symbol}
                onMouseEnter={() => setHoveredSymbol(stock.symbol)}
                onMouseLeave={() => setHoveredSymbol(null)}
                className={`bg-[#131511] border rounded-xl p-4 flex flex-col justify-between gap-4 transition hover:border-[#cfd8c6]/50 shadow-sm ${
                  isSelected ? 'border-[#cfd8c6]' : 'border-[#262923]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#f1f0e8] font-['IBM_Plex_Mono',monospace]">
                          {stock.symbol}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1d18] text-[#8f9388] border border-[#262923] font-['IBM_Plex_Mono',monospace]">
                          {stock.sector}
                        </span>
                      </div>
                      <div className="text-xs text-[#8f9388] truncate max-w-[180px]">{stock.name}</div>
                    </div>
                    <div className="text-right font-['IBM_Plex_Mono',monospace]">
                      <div className="text-base font-bold text-[#f1f0e8]">${stock.ammPrice.toFixed(2)}</div>
                      <div className={`text-xs font-medium ${isPos ? 'text-[#6f9a72]' : 'text-[#c45c4a]'}`}>
                        {isPos ? '+' : ''}{stock.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1a1d18] rounded-lg p-2.5 border border-[#262923] text-xs font-['IBM_Plex_Mono',monospace] space-y-1.5">
                    <div className="flex items-center justify-between text-[#8f9388]">
                      <span>Official Price:</span>
                      <span className="text-[#f1f0e8]">${stock.chainlinkPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#8f9388]">
                      <span>Price Gap:</span>
                      <span className={stock.basisBps > 150 ? 'text-[#c4a46a] font-semibold' : 'text-[#6f9a72]'}>
                        {stock.basisBps > 0 ? `+${stock.basisBps} bps` : `${stock.basisBps} bps`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#8f9388]">
                      <span>Depository:</span>
                      <span className="text-[#cfd8c6] text-[11px]">Real shares held by Coinbase</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#262923] flex items-center justify-between">
                  <span className="text-[10px] font-['IBM_Plex_Mono',monospace] text-[#8f9388]">
                    {stock.token.slice(0, 6)}...{stock.token.slice(-4)}
                  </span>
                  <button
                    onClick={() => {
                      onSelectStock(stock.symbol);
                      onLaunchTerminal('desk');
                    }}
                    className="h-8 px-3 bg-[#1a1d18] hover:bg-[#cfd8c6] hover:text-[#0c0d0b] text-[#cfd8c6] border border-[#262923] rounded-md text-xs font-semibold transition flex items-center gap-1 font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
                  >
                    <span>Trade Stock</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. OnchainKit & Smart Wallet Onboarding Module */}
      <div className="rounded-2xl bg-gradient-to-b from-[#131511] to-[#0c0d0b] border border-[#262923] p-5 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262923] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-[#cfd8c6] font-['IBM_Plex_Mono',monospace] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#cfd8c6]" />
              <span>Easy Account Setup</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
              Sign in with Touch ID, Google, or Your Wallet
            </h3>
            <p className="text-xs text-[#8f9388] max-w-xl mt-1">
              No browser extension needed. Create a smart account on Base with Face ID, or sign in with your Google account.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-['IBM_Plex_Mono',monospace] bg-[#1a1d18] p-2 rounded-lg border border-[#262923] text-[#8f9388]">
            <ShieldCheck className="w-4 h-4 text-[#6f9a72]" />
            <span>Passkey WebAuthn &middot; No Secret Recovery Words</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Option 1: Passkey */}
          <div className="p-4 bg-[#1a1d18] border border-[#262923] rounded-xl flex flex-col justify-between space-y-4 hover:border-[#cfd8c6]/40 transition">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#131511] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                <KeyRound className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#f1f0e8]">Coinbase Smart Wallet</h4>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Sign in with your fingerprint or face. Pay zero gas fees on Base.
              </p>
            </div>
            <button
              onClick={() => onConnectOnchainKit('passkey')}
              className="h-9 w-full bg-[#cfd8c6] hover:bg-[#b8c3af] text-[#0c0d0b] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
            >
              <span>Continue with Passkey</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Option 2: Social Login */}
          <div className="p-4 bg-[#1a1d18] border border-[#262923] rounded-xl flex flex-col justify-between space-y-4 hover:border-[#cfd8c6]/40 transition">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#131511] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#f1f0e8]">Google Login</h4>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Create a smart account connected to your Google email.
              </p>
            </div>
            <button
              onClick={() => onConnectOnchainKit('google')}
              className="h-9 w-full bg-[#131511] hover:bg-[#20241e] text-[#f1f0e8] border border-[#262923] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
            >
              <span>Sign in with Google</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Option 3: Browser Extension */}
          <div className="p-4 bg-[#1a1d18] border border-[#262923] rounded-xl flex flex-col justify-between space-y-4 hover:border-[#cfd8c6]/40 transition">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#131511] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#f1f0e8]">Browser Wallet</h4>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Connect MetaMask, Coinbase Wallet, or Rainbow on Base.
              </p>
            </div>
            <button
              onClick={() => onConnectOnchainKit('injected')}
              className="h-9 w-full bg-[#131511] hover:bg-[#20241e] text-[#f1f0e8] border border-[#262923] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
            >
              <span>Connect Browser Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Option 4: Onchain Equity Custody */}
          <div className="p-4 bg-[#1a1d18] border border-[#262923] rounded-xl flex flex-col justify-between space-y-4 hover:border-[#cfd8c6]/40 transition">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#131511] border border-[#262923] flex items-center justify-center text-[#6f9a72]">
                <Coins className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#f1f0e8]">Real Stock Backing</h4>
              <p className="text-xs text-[#8f9388] leading-relaxed">
                Each token is matched to a real share held by Coinbase.
              </p>
            </div>
            <button
              onClick={() => onLaunchTerminal('discover')}
              className="h-9 w-full bg-[#131511] hover:bg-[#20241e] text-[#6f9a72] border border-[#6f9a72]/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
            >
              <span>Browse Stocks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Email Passwordless Form */}
        <form onSubmit={handleEmailSubmit} className="pt-2 flex flex-col sm:flex-row items-center gap-2 max-w-xl">
          <input
            type="email"
            value={socialEmailInput}
            onChange={(e) => setSocialEmailInput(e.target.value)}
            placeholder="Or enter your email for smart account setup..."
            className="w-full h-10 px-3.5 rounded-lg bg-[#1a1d18] border border-[#262923] text-xs text-[#f1f0e8] placeholder-[#8f9388] focus:outline-none focus:border-[#cfd8c6] font-['IBM_Plex_Sans',sans-serif]"
          />
          <button
            type="submit"
            disabled={isSubmittingEmail}
            className="w-full sm:w-auto h-10 shrink-0 px-4 bg-[#cfd8c6] hover:bg-[#b8c3af] text-[#0c0d0b] text-xs font-semibold rounded-lg transition font-['IBM_Plex_Sans',sans-serif] cursor-pointer"
          >
            {isSubmittingEmail ? 'Creating Smart Account...' : 'Continue with Email'}
          </button>
        </form>
      </div>

      {/* 5. Terminal Capabilities Architecture Bento */}
      <div className="space-y-4">
        <h3 className="text-xl sm:text-2xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
          What You Can Do
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onLaunchTerminal('desk')}
            className="p-5 bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 rounded-xl space-y-3 cursor-pointer transition"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
              <LineChart className="w-4 h-4" />
            </div>
            <h4 className="text-base font-['Instrument_Serif',serif] text-[#f1f0e8]">Spot Trading &amp; Price Guard</h4>
            <p className="text-xs text-[#8f9388] leading-relaxed">
              Trade stocks with 0x and Aerodrome. Trades are blocked if the exchange price drifts too far from the official price.
            </p>
            <div className="text-xs text-[#cfd8c6] font-medium flex items-center gap-1 font-['IBM_Plex_Mono',monospace]">
              <span>Open Spot Desk</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onLaunchTerminal('portfolio')}
            className="p-5 bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 rounded-xl space-y-3 cursor-pointer transition"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
              <Coins className="w-4 h-4" />
            </div>
            <h4 className="text-base font-['Instrument_Serif',serif] text-[#f1f0e8]">Portfolio &amp; PnL Ledger</h4>
            <p className="text-xs text-[#8f9388] leading-relaxed">
              Track aggregate net asset value (NAV), real-time 24h PnL, sector allocation, and 1:1 DTC custody breakdown.
            </p>
            <div className="text-xs text-[#cfd8c6] font-medium flex items-center gap-1 font-['IBM_Plex_Mono',monospace]">
              <span>View Portfolio</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onLaunchTerminal('slabs')}
            className="p-5 bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 rounded-xl space-y-3 cursor-pointer transition"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="text-base font-['Instrument_Serif',serif] text-[#f1f0e8]">Stock Baskets</h4>
            <p className="text-xs text-[#8f9388] leading-relaxed">
              Build and mint custom baskets of official Coinbase stocks on Base. Each basket holds real stocks and USDC.
            </p>
            <div className="text-xs text-[#cfd8c6] font-medium flex items-center gap-1 font-['IBM_Plex_Mono',monospace]">
              <span>Open Basket Maker</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onLaunchTerminal('desk')}
            className="p-5 bg-[#131511] border border-[#262923] hover:border-[#cfd8c6]/40 rounded-xl space-y-3 cursor-pointer transition"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-base font-['Instrument_Serif',serif] text-[#f1f0e8]">Earn Fees (Aerodrome LP)</h4>
            <p className="text-xs text-[#8f9388] leading-relaxed">
              Put this stock and USDC in the Aerodrome pool. You earn a cut of swap fees directly in your wallet.
            </p>
            <div className="text-xs text-[#cfd8c6] font-medium flex items-center gap-1 font-['IBM_Plex_Mono',monospace]">
              <span>Provide Liquidity</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

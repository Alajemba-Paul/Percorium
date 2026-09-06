import React, { useState } from 'react';
import {
  Wallet,
  KeyRound,
  UserCheck,
  Zap,
  ArrowRight,
  LogOut,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  isConnected: boolean;
  walletType?: 'injected' | 'smart_passkey' | 'smart_google';
  userBalanceUsdc: number;
  onConnectInjected: () => void;
  onConnectSmartWallet: (method: 'passkey' | 'google') => void;
  onDisconnect?: () => void;
}

export const WalletModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userAddress,
  isConnected,
  walletType,
  userBalanceUsdc,
  onConnectInjected,
  onConnectSmartWallet,
  onDisconnect,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEmailConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onConnectSmartWallet('google');
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  const getWalletTypeLabel = () => {
    switch (walletType) {
      case 'smart_passkey':
        return 'Coinbase Smart Wallet (Passkey)';
      case 'smart_google':
        return 'Social Login (Google Smart Account)';
      case 'injected':
        return 'Injected Browser Wallet';
      default:
        return 'Base Web3 Account';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['IBM_Plex_Sans',sans-serif]">
      <div className="bg-[#131511] border border-[#262923] rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#262923] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1d18] border border-[#262923] flex items-center justify-center text-[#cfd8c6]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xl font-['Instrument_Serif',serif] text-[#f1f0e8]">
                {isConnected ? 'Connected Account' : 'Connect Wallet'}
              </h3>
              <p className="text-[11px] text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
                Base Mainnet &middot; Chain ID 8453
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8f9388] hover:text-[#f1f0e8] text-lg leading-none transition cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Status card */}
        <div className="p-3.5 bg-[#1a1d18] rounded-lg border border-[#262923] text-xs font-['IBM_Plex_Mono',monospace] space-y-2">
          <div className="flex justify-between text-[#8f9388]">
            <span>Network:</span>
            <span className="text-[#6f9a72] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6f9a72] inline-block animate-pulse" />
              Base Mainnet
            </span>
          </div>
          <div className="flex justify-between text-[#8f9388]">
            <span>Account:</span>
            <span className="text-[#f1f0e8] font-medium truncate max-w-[200px]">
              {isConnected && userAddress ? `${userAddress.slice(0, 8)}...${userAddress.slice(-6)}` : 'Not Connected'}
            </span>
          </div>
          {isConnected && (
            <>
              <div className="flex justify-between text-[#8f9388]">
                <span>Type:</span>
                <span className="text-[#cfd8c6]">{getWalletTypeLabel()}</span>
              </div>
              <div className="flex justify-between text-[#8f9388]">
                <span>Real USDC:</span>
                <span className="text-[#6f9a72] font-bold">${userBalanceUsdc.toFixed(2)} USDC</span>
              </div>
            </>
          )}
        </div>

        {isConnected ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 p-3 bg-[#1a1d18] border border-[#262923] rounded-lg text-xs text-[#cfd8c6]">
              <CheckCircle2 className="w-4 h-4 text-[#6f9a72] shrink-0" />
              <span>Wallet connected and ready for spot trading and index minting on Base.</span>
            </div>
            {onDisconnect && (
              <button
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="w-full py-2.5 bg-[#262923]/40 hover:bg-[#262923] text-[#cfd8c6] border border-[#262923] rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Disconnect Wallet</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Coinbase Smart Wallet / Passkey options */}
            <div className="space-y-2">
              <div className="text-[11px] font-['IBM_Plex_Mono',monospace] text-[#cfd8c6] flex items-center gap-1.5 font-medium">
                <KeyRound className="w-3.5 h-3.5 text-[#cfd8c6]" />
                <span>Coinbase Smart Wallet (Passkey / Social)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onConnectSmartWallet('passkey');
                    onClose();
                  }}
                  className="p-3 bg-[#cfd8c6] hover:bg-[#b8c3af] text-[#0c0d0b] rounded-lg text-xs font-semibold flex items-center justify-between transition shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    <span>Passkey / FaceID</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    onConnectSmartWallet('google');
                    onClose();
                  }}
                  className="p-3 bg-[#1a1d18] hover:bg-[#20241e] text-[#f1f0e8] border border-[#262923] rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#cfd8c6]" />
                    <span>Google Sign In</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleEmailConnect} className="flex gap-2 pt-1">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Or sign in with email..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1a1d18] border border-[#262923] text-xs text-[#f1f0e8] placeholder-[#8f9388] focus:outline-none focus:border-[#cfd8c6] font-['IBM_Plex_Sans',sans-serif]"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-[#1a1d18] hover:bg-[#262923] text-[#cfd8c6] border border-[#262923] rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {isSubmitting ? '...' : 'Connect'}
                </button>
              </form>
            </div>

            {/* Injected Browser Extension */}
            <div className="space-y-2 pt-2 border-t border-[#262923]">
              <div className="text-[11px] font-['IBM_Plex_Mono',monospace] text-[#8f9388]">
                Browser Extensions
              </div>

              <button
                onClick={() => {
                  onConnectInjected();
                  onClose();
                }}
                className="w-full p-2.5 bg-[#1a1d18] hover:bg-[#20241e] text-[#f1f0e8] border border-[#262923] rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#cfd8c6]" />
                  <span>MetaMask &middot; Coinbase Wallet &middot; Rainbow &middot; Rabby</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8f9388]" />
              </button>
            </div>
          </>
        )}

        <div className="text-[11px] text-[#8f9388] text-center leading-relaxed">
          Percorium operates strictly on Base Mainnet. Non-US eligible jurisdiction required.
        </div>
      </div>
    </div>
  );
};

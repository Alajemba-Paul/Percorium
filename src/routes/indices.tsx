import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { BasketBuilder } from "@/components/basket-builder";
import { IndexWorkshop } from "@/components/index-workshop";
import { WalletModal } from "@/components/wallet-modal";
import { useStockBalances } from "@/hooks/use-balances";
import type { StockSymbol } from "@/lib/percorium/constants";

export const Route = createFileRoute("/indices")({ component: IndicesPage });

function IndicesPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const balances = useStockBalances();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletType, setWalletType] = useState<
    "injected" | "smart_passkey" | "smart_google" | undefined
  >(undefined);

  const handleConnectInjected = () => {
    const injected = connectors.find((c) => c.id === "injected");
    if (injected) {
      connect({ connector: injected });
      setWalletType("injected");
      setWalletModalOpen(false);
    }
  };

  const handleConnectSmartWallet = (method: "passkey" | "google") => {
    const cb = connectors.find((c) => c.id === "coinbaseWalletSDK");
    if (cb) {
      connect({ connector: cb });
      setWalletType(method === "passkey" ? "smart_passkey" : "smart_google");
      setWalletModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <BasketBuilder />

      <div className="border-t border-border pt-6">
        <h2 className="font-display text-2xl tracking-tight mb-2">
          Pre-Curated Baskets & Slabs
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Pre-composed baskets using official Coinbase stock inventories.
        </p>
        <IndexWorkshop
          userEffectiveUsdc={balances.effectiveUsdc}
          isConnected={isConnected}
          onOpenWalletModal={() => setWalletModalOpen(true)}
          onTradeStock={(_symbol: StockSymbol) => {
            navigate({ to: "/swap" });
          }}
        />
      </div>

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        userAddress={address || ""}
        isConnected={isConnected}
        walletType={walletType}
        userBalanceUsdc={balances.effectiveUsdc}
        onConnectInjected={handleConnectInjected}
        onConnectSmartWallet={handleConnectSmartWallet}
        onDisconnect={() => {
          disconnect();
          setWalletType(undefined);
        }}
      />
    </div>
  );
}



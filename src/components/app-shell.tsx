import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { type ReactNode } from "react";
import { EligibilityBanner, EligibilityChip } from "@/components/eligibility-banner";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: Sparkles },
  { to: "/swap", label: "Trade" },
  { to: "/indices", label: "Baskets" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/") {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0a0b09] text-[#f1f0e8]">
        <EligibilityBanner />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[#262923] bg-[#0c0d0b] px-4 py-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-[#8f9388] sm:flex-row sm:justify-between font-['IBM_Plex_Mono',monospace]">
            <p>Official Coinbase stocks on Base. Each token is matched to a real share held by Coinbase.</p>
            <p>Non-US only. All trades settle in USDC on Base.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#262923] bg-[#0c0d0b]/90 backdrop-blur-sm">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 max-w-6xl">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-xl tracking-tight text-foreground">
                Percorium
              </span>
              <span className="rounded-full bg-[#1a1d18] border border-[#262923] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#cfd8c6] font-['IBM_Plex_Mono',monospace]">
                BASE
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x">
              {NAV.map((item) => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                const Icon = "icon" in item ? item.icon : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-1.5 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                      active
                        ? "bg-[#cfd8c6] text-[#0c0d0b]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <EligibilityChip />
            <WalletButton />
          </div>
        </div>
      </header>
      <EligibilityBanner />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-[#262923] px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-between font-['IBM_Plex_Mono',monospace]">
          <p>Official Coinbase stocks on Base. Each token is matched to a real share held by Coinbase.</p>
          <p>Non-US only. All trades settle in USDC on Base.</p>
        </div>
      </footer>
    </div>
  );
}

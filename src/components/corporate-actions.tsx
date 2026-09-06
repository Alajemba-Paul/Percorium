import React from "react";
import {
  Calendar,
  DollarSign,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  COINBASE_STOCKS_REGISTRY,
  type StockMeta,
} from "@/lib/percorium/constants";
import {
  STOCK_CORPORATE_ACTIONS,
} from "@/lib/percorium/corporate-actions";
import { shortAddress } from "@/lib/percorium/format";

export function CorporateActionsPanel({ stock }: { stock: StockMeta }) {
  const actions = STOCK_CORPORATE_ACTIONS[stock.symbol] ?? {
    annualDividendPerShare: 0,
    dividendYieldPct: 0,
    dividendFrequency: "N/A",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment" as const,
    dtcCustodian: "DTC Eligible Broker-Custodian",
    secFilingType: "10-Q (Quarterly)" as const,
    lastFilingDate: "Recent",
    nextEarningsEstimate: "Upcoming",
  };

  const hasDividends = actions.annualDividendPerShare > 0;

  return (
    <div className="rounded-xl bg-card p-5 shadow-border space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <div>
            <h3 className="font-display text-lg text-foreground">
              Corporate Actions &amp; DTC Custody
            </h3>
            <p className="text-xs text-muted-foreground">
              1:1 equity backing at DTC with native onchain corporate action handling on Base
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20 text-[11px] font-mono">
            <CheckCircle2 className="size-3 mr-1" />
            1:1 DTC Custodied
          </Badge>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-elevated/60 p-3 border border-border/40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <DollarSign className="size-3" />
            <span>Dividend Yield</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {hasDividends ? `${actions.dividendYieldPct}%` : "0.00% (Growth)"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {actions.dividendFrequency}
          </div>
        </div>

        <div className="rounded-lg bg-elevated/60 p-3 border border-border/40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3" />
            <span>Next Ex-Dividend</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {actions.nextExDate}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Pay Date: {actions.nextPaymentDate}
          </div>
        </div>

        <div className="rounded-lg bg-elevated/60 p-3 border border-border/40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            <span>Next Earnings</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {actions.nextEarningsEstimate}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Filing: {actions.secFilingType}
          </div>
        </div>

        <div className="rounded-lg bg-elevated/60 p-3 border border-border/40">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <FileText className="size-3" />
            <span>SEC Disclosure</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground truncate">
            {actions.secFilingType}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Filed: {actions.lastFilingDate}
          </div>
        </div>
      </div>

      {/* Custody Transparency Note */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-foreground font-medium">
            Coinbase B20 Trust &amp; Custody Structure
          </p>
          <p className="leading-relaxed">
            Every {stock.symbol} token on Base represents a direct claim on one share of {stock.company} held in custody by a licensed US broker-custodian at Depository Trust Company (DTC). Registered under Base official equity registry <span className="font-mono text-foreground font-medium">{shortAddress(COINBASE_STOCKS_REGISTRY, 6)}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

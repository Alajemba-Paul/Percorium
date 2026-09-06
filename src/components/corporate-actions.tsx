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
import { shortAddress } from "@/lib/percorium/format";

export interface CorporateActionData {
  annualDividendPerShare: number;
  dividendYieldPct: number;
  dividendFrequency: string;
  nextExDate: string;
  nextPaymentDate: string;
  payoutType: "Cash Dividend (Auto-Credit)" | "Growth Reinvestment" | "BTC Reserve Treasury";
  dtcCustodian: string;
  secFilingType: "10-Q (Quarterly)" | "10-K (Annual)" | "S-1 Filing";
  lastFilingDate: string;
  nextEarningsEstimate: string;
}

export const STOCK_CORPORATE_ACTIONS: Record<string, CorporateActionData> = {
  AAPLc: {
    annualDividendPerShare: 1.00,
    dividendYieldPct: 0.44,
    dividendFrequency: "Quarterly ($0.25/sh)",
    nextExDate: "Nov 08, 2026",
    nextPaymentDate: "Nov 14, 2026",
    payoutType: "Cash Dividend (Auto-Credit)",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Jul 31, 2026",
    nextEarningsEstimate: "Oct 29, 2026",
  },
  MSFTc: {
    annualDividendPerShare: 3.32,
    dividendYieldPct: 0.74,
    dividendFrequency: "Quarterly ($0.83/sh)",
    nextExDate: "Nov 20, 2026",
    nextPaymentDate: "Dec 11, 2026",
    payoutType: "Cash Dividend (Auto-Credit)",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Jul 30, 2026",
    nextEarningsEstimate: "Oct 24, 2026",
  },
  NVDAc: {
    annualDividendPerShare: 0.04,
    dividendYieldPct: 0.03,
    dividendFrequency: "Quarterly ($0.01/sh)",
    nextExDate: "Dec 04, 2026",
    nextPaymentDate: "Dec 26, 2026",
    payoutType: "Cash Dividend (Auto-Credit)",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Aug 28, 2026",
    nextEarningsEstimate: "Nov 19, 2026",
  },
  GOOGLc: {
    annualDividendPerShare: 0.80,
    dividendYieldPct: 0.48,
    dividendFrequency: "Quarterly ($0.20/sh)",
    nextExDate: "Dec 08, 2026",
    nextPaymentDate: "Dec 15, 2026",
    payoutType: "Cash Dividend (Auto-Credit)",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Jul 23, 2026",
    nextEarningsEstimate: "Oct 22, 2026",
  },
  METAc: {
    annualDividendPerShare: 2.00,
    dividendYieldPct: 0.35,
    dividendFrequency: "Quarterly ($0.50/sh)",
    nextExDate: "Dec 14, 2026",
    nextPaymentDate: "Dec 23, 2026",
    payoutType: "Cash Dividend (Auto-Credit)",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Jul 31, 2026",
    nextEarningsEstimate: "Oct 30, 2026",
  },
  INTCc: {
    annualDividendPerShare: 0.50,
    dividendYieldPct: 2.15,
    dividendFrequency: "Quarterly ($0.125/sh)",
    nextExDate: "Nov 06, 2026",
    nextPaymentDate: "Dec 01, 2026",
    payoutType: "Cash Dividend (Auto-Credit)",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Aug 01, 2026",
    nextEarningsEstimate: "Oct 24, 2026",
  },
  COINc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (Growth Reinvestment)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment",
    dtcCustodian: "DTC Eligible / Coinbase Custody Broker Partner",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Aug 01, 2026",
    nextEarningsEstimate: "Oct 31, 2026",
  },
  TSLAc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (Growth Reinvestment)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Jul 23, 2026",
    nextEarningsEstimate: "Oct 16, 2026",
  },
  AMZNc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (Growth Reinvestment)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Aug 01, 2026",
    nextEarningsEstimate: "Oct 24, 2026",
  },
  MSTRc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (BTC Accumulation)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "BTC Reserve Treasury",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Aug 01, 2026",
    nextEarningsEstimate: "Oct 30, 2026",
  },
  CRCLc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (Pre-IPO Growth)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment",
    dtcCustodian: "Institutional Custody Partner",
    secFilingType: "S-1 Filing",
    lastFilingDate: "Jun 15, 2026",
    nextEarningsEstimate: "Q4 2026",
  },
  SNDKc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (Growth Reinvestment)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment",
    dtcCustodian: "DTC Eligible / Licensed US Broker-Custodian",
    secFilingType: "10-Q (Quarterly)",
    lastFilingDate: "Jul 25, 2026",
    nextEarningsEstimate: "Nov 05, 2026",
  },
  SPCXc: {
    annualDividendPerShare: 0.00,
    dividendYieldPct: 0.00,
    dividendFrequency: "N/A (Private Equity Growth)",
    nextExDate: "N/A",
    nextPaymentDate: "N/A",
    payoutType: "Growth Reinvestment",
    dtcCustodian: "Qualified Institutional Custodian",
    secFilingType: "S-1 Filing",
    lastFilingDate: "May 20, 2026",
    nextEarningsEstimate: "Q4 2026",
  },
};

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

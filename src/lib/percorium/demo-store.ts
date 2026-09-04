import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StockSymbol } from "./constants";

export type JurisdictionMode = "auto" | "eligible" | "us";

type DemoState = {
  jurisdiction: JurisdictionMode;
  acknowledgedNonUs: boolean;
  demoHoldings: Partial<Record<StockSymbol | string, number>>;
  setJurisdiction: (mode: JurisdictionMode) => void;
  setAcknowledged: (ok: boolean) => void;
  setDemoHolding: (id: string, units: number) => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      jurisdiction: "auto",
      acknowledgedNonUs: false,
      demoHoldings: {},
      setJurisdiction: (jurisdiction) => set({ jurisdiction }),
      setAcknowledged: (acknowledgedNonUs) => set({ acknowledgedNonUs }),
      setDemoHolding: (id, units) =>
        set((s) => ({
          demoHoldings: { ...s.demoHoldings, [id]: units },
        })),
    }),
    { name: "percorium-demo" },
  ),
);

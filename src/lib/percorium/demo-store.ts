import { create } from "zustand";
import { persist } from "zustand/middleware";

export type JurisdictionMode = "auto" | "eligible" | "us";

type EligibilityState = {
  jurisdiction: JurisdictionMode;
  acknowledgedNonUs: boolean;
  setJurisdiction: (mode: JurisdictionMode) => void;
  setAcknowledged: (ok: boolean) => void;
};

export const useDemoStore = create<EligibilityState>()(
  persist(
    (set) => ({
      jurisdiction: "auto",
      acknowledgedNonUs: false,
      setJurisdiction: (jurisdiction) => set({ jurisdiction }),
      setAcknowledged: (acknowledgedNonUs) => set({ acknowledgedNonUs }),
    }),
    { name: "percorium-compliance-gate" },
  ),
);

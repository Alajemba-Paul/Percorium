import { ShieldAlert } from "lucide-react";
import { useEligibility } from "@/hooks/use-board";
import { useHydrated } from "@/hooks/use-hydrated";

export function EligibilityBanner() {
  const hydrated = useHydrated();
  const { restricted, country } = useEligibility();

  if (!hydrated) return null;
  if (!restricted) return null;

  return (
    <div className="border-b border-[#262923] bg-[#c45c4a]/10 px-4 py-2 text-xs font-['IBM_Plex_Sans',sans-serif]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#c45c4a]">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span>Not available in the US{country ? ` (${country})` : ""}. Trading is blocked.</span>
        </div>
      </div>
    </div>
  );
}

export function EligibilityChip() {
  const hydrated = useHydrated();
  const { restricted, country } = useEligibility();
  if (!hydrated) return null;
  if (restricted) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-[#c45c4a] sm:inline-flex font-['IBM_Plex_Mono',monospace]">
        <ShieldAlert className="size-3" />
        US blocked{country ? ` · ${country}` : ""}
      </span>
    );
  }
  return null;
}

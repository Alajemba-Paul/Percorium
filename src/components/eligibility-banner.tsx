import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_COPY } from "@/lib/percorium/constants";
import { useDemoStore } from "@/lib/percorium/demo-store";
import { useEligibility } from "@/hooks/use-board";
import { useHydrated } from "@/hooks/use-hydrated";

export function EligibilityBanner() {
  const hydrated = useHydrated();
  const { restricted, needsAck, country, geoRestricted } = useEligibility();
  const { setAcknowledged, setJurisdiction, jurisdiction } = useDemoStore();

  if (!hydrated) return null;
  if (!restricted && !needsAck) return null;

  if (needsAck) {
    return (
      <div className="border-b border-border bg-elevated px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-pretty text-muted-foreground">
            {COMPLIANCE_COPY} Please confirm you are not in the US before trading or borrowing.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAcknowledged(true)}>
              I am outside the US
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setJurisdiction("us")}
            >
              I am in the US
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-destructive/10 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Not available in your country
              {country ? ` · ${country}` : ""}
            </p>
            <p className="text-sm text-pretty text-muted-foreground">
              {COMPLIANCE_COPY} You can view stock prices. Trading, minting, and borrowing are blocked.
            </p>
          </div>
        </div>
        {jurisdiction !== "auto" || geoRestricted ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setJurisdiction("auto");
              setAcknowledged(false);
            }}
          >
            Reset location
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EligibilityChip() {
  const hydrated = useHydrated();
  const { restricted, needsAck, country } = useEligibility();
  if (!hydrated) return null;
  if (needsAck) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-warn sm:inline-flex">
        <ShieldAlert className="size-3.5" />
        Confirm location
      </span>
    );
  }
  if (restricted) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-destructive sm:inline-flex">
        <ShieldAlert className="size-3.5" />
        US blocked{country ? ` · ${country}` : ""}
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 text-xs text-success sm:inline-flex">
      <ShieldCheck className="size-3.5" />
      Eligible
    </span>
  );
}

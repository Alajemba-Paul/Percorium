import type { FeedStatus, SequencerState } from "@/lib/percorium/types";

export function basisBps(ammUsd: number, chainlinkUsd: number): number | null {
  if (!Number.isFinite(ammUsd) || !Number.isFinite(chainlinkUsd) || chainlinkUsd === 0) {
    return null;
  }
  return ((ammUsd - chainlinkUsd) / chainlinkUsd) * 10_000;
}

export type BasisTone = "premium" | "discount" | "paused" | "flat";

export type BasisView = {
  bps: number | null;
  tone: BasisTone;
  label: string;
  signal: boolean;
};

export function oraclePaused(opts: {
  feedStatus?: FeedStatus;
  sequencer?: SequencerState | null;
}): boolean {
  if (opts.sequencer && (!opts.sequencer.up || opts.sequencer.grace)) return true;
  return opts.feedStatus === "paused" || opts.feedStatus === "stale";
}

export function basisView(opts: {
  ammUsd: number | null | undefined;
  chainlinkUsd: number;
  feedStatus?: FeedStatus;
  sequencer?: SequencerState | null;
}): BasisView {
  if (oraclePaused(opts) || !opts.chainlinkUsd) {
    return { bps: null, tone: "paused", label: "oracle paused", signal: false };
  }
  if (opts.ammUsd == null || !Number.isFinite(opts.ammUsd)) {
    return { bps: null, tone: "flat", label: "no AMM", signal: false };
  }
  const raw = basisBps(opts.ammUsd, opts.chainlinkUsd);
  if (raw == null) {
    return { bps: null, tone: "flat", label: "—", signal: false };
  }
  const bps = Math.round(raw);
  if (Math.abs(bps) < 1) {
    return { bps, tone: "flat", label: "flat", signal: true };
  }
  if (bps > 0) {
    return { bps, tone: "premium", label: `+${bps} bps premium`, signal: true };
  }
  return { bps, tone: "discount", label: `${bps} bps discount`, signal: true };
}

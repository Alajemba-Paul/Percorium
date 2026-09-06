export function shortAddress(addr: string, size = 4): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function formatUsd(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const d = abs >= 1000 ? 2 : abs >= 1 ? Math.max(2, digits) : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(value);
}

export function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNum(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatBps(bps: number): string {
  const sign = bps > 0 ? "+" : "";
  return `${sign}${(bps / 100).toFixed(2)}%`;
}

export function formatPct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatRelative(unixSec: number): string {
  if (!unixSec) return "—";
  const delta = Date.now() / 1000 - unixSec;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export function nyNow(d = new Date()) {
  return new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

export function isUsCashClosed(d = new Date()) {
  const ny = nyNow(d);
  const day = ny.getDay(); // 0 Sun … 6 Sat
  const mins = ny.getHours() * 60 + ny.getMinutes();
  if (day === 0 || day === 6) return true;
  if (day === 5 && mins >= 16 * 60) return true; // Fri after 16:00
  if (day === 1 && mins < 9 * 60 + 30) return true; // Mon before 9:30
  return false;
}

export type OfficialPriceBadgeResult = {
  tone: "warn" | "danger" | "ok";
  label: string;
  subtext?: string;
  blockTrade: boolean;
};

export function officialPriceBadge(updatedAtSec: number): OfficialPriceBadgeResult {
  const ageH = (Date.now() / 1000 - updatedAtSec) / 3600;
  if (isUsCashClosed()) {
    return {
      tone: "warn",
      label: "Markets closed — showing last Friday official close",
      subtext: "Onchain price can still move. Official price updates when the US stock market opens.",
      blockTrade: false, // still allow DEX swap if you want weekend trading
    };
  }
  if (ageH > 2) {
    return {
      tone: "danger",
      label: "Official price delayed. Buying is paused.",
      subtext: undefined,
      blockTrade: true,
    };
  }
  return {
    tone: "ok",
    label: "Official price",
    subtext: undefined,
    blockTrade: false,
  };
}

export function isUsEquitySession(now = new Date()): {
  weekday: boolean;
  sessionOpen: boolean;
  label: string;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  const weekday = !["Sat", "Sun"].includes(parts.weekday ?? "");
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const mins = hour * 60 + minute;
  const sessionOpen = weekday && mins >= 9 * 60 + 30 && mins < 16 * 60;
  const label = isUsCashClosed(now)
    ? "Markets closed — showing last Friday official close"
    : sessionOpen
      ? "Cash session open"
      : "Overnight — 24/5 feed";
  return { weekday, sessionOpen, label };
}

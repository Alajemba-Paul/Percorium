import { Badge } from "@/components/ui/badge";
import { formatRelative, officialPriceBadge } from "@/lib/percorium/format";
import { cn } from "@/lib/utils";

export function OfficialPriceBadge({
  updatedAt,
  showSubtext = true,
  align = "right",
  className,
}: {
  updatedAt?: number;
  showSubtext?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  if (!updatedAt) return null;
  const badgeInfo = officialPriceBadge(updatedAt);

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        align === "right" && "items-start sm:items-end text-left sm:text-right",
        align === "left" && "items-start text-left",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            badgeInfo.tone === "warn"
              ? "warn"
              : badgeInfo.tone === "danger"
                ? "danger"
                : "live"
          }
          className={cn(
            "tracking-normal text-xs font-medium py-0.5 px-2.5",
            badgeInfo.tone === "warn" && "bg-[#c4a46a]/15 text-[#c4a46a]",
            badgeInfo.tone === "danger" && "bg-[#c45c4a]/15 text-[#c45c4a]",
          )}
        >
          {badgeInfo.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatRelative(updatedAt)}
        </span>
      </div>
      {showSubtext && badgeInfo.subtext ? (
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {badgeInfo.subtext}
        </p>
      ) : null}
    </div>
  );
}

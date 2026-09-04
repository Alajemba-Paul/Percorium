import { cn } from "@/lib/utils";

export function StockMark({
  symbol,
  size = "md",
}: {
  symbol: string;
  size?: "sm" | "md" | "lg";
}) {
  const letter = symbol.replace(/c$/, "").slice(0, 1);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-elevated font-display text-primary",
        size === "sm" && "size-8 text-base",
        size === "md" && "size-10 text-lg",
        size === "lg" && "size-14 text-2xl",
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}

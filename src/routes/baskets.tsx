import { createFileRoute } from "@tanstack/react-router";
import { BasketBuilder } from "@/components/basket-builder";

export const Route = createFileRoute("/baskets")({
  component: BasketsPage,
});

function BasketsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
          Stock Baskets
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, customize, and share multi-stock portfolios composed of official Coinbase B20 stocks on Base.
        </p>
      </div>

      <BasketBuilder />
    </div>
  );
}

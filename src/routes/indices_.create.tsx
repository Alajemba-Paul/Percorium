import { createFileRoute } from "@tanstack/react-router";
import { BasketBuilder } from "@/components/basket-builder";

export const Route = createFileRoute("/indices_/create")({
  component: CreateIndex,
});

function CreateIndex() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
          Create Stock Basket
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick 2–10 official Coinbase B20 stocks, allocate percentage weights, and generate a shareable link.
        </p>
      </div>

      <BasketBuilder />
    </div>
  );
}


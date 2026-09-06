import { createFileRoute } from "@tanstack/react-router";
import { BasketView } from "@/components/basket-view";
import { BasketBuilder } from "@/components/basket-builder";

export const Route = createFileRoute("/b/")({
  validateSearch: (search: Record<string, unknown>): { d?: string } => {
    return {
      d: typeof search.d === "string" && search.d.trim().length > 0 ? search.d : undefined,
    };
  },
  component: BasketIndexRoute,
});

function BasketIndexRoute() {
  const { d } = Route.useSearch();

  if (d) {
    return <BasketView payload={d} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl tracking-tight">Stock Baskets</h1>
        <p className="text-sm text-muted-foreground">
          Create and share customized allocations of official Coinbase stocks on Base.
        </p>
      </div>
      <BasketBuilder />
    </div>
  );
}

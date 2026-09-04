import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { StockChart } from "@/components/StockChart";
import { STOCK_BY_ADDRESS } from "@/lib/percorium/constants";

export const Route = createFileRoute("/stock/$address")({
  beforeLoad: ({ params }) => {
    const stock = STOCK_BY_ADDRESS[params.address.toLowerCase()];
    if (stock) {
      throw redirect({
        to: "/stocks/$symbol",
        params: { symbol: stock.symbol },
      });
    }
  },
  component: UnknownStockPage,
});

function UnknownStockPage() {
  const { address } = Route.useParams();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Address lookup
        </p>
        <h1 className="font-display text-3xl tracking-tight">Unknown token</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {address} is not a Coinbase-issued B20 stock. Percorium will not
          embed a chart for lookalikes.
        </p>
      </div>
      <StockChart tokenAddress={address} symbol="—" />
      <Link to="/" className="text-sm underline-offset-2 hover:underline">
        Back to discover
      </Link>
    </div>
  );
}

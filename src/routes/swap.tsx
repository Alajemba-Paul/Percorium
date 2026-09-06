import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TradeTicket } from "@/components/trade-ticket";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STOCKS, type StockSymbol } from "@/lib/percorium/constants";
import { usePriceBoard, quoteMap } from "@/hooks/use-board";

export const Route = createFileRoute("/swap")({ component: SwapPage });

function SwapPage() {
  const [symbol, setSymbol] = useState<StockSymbol>("NVDAc");
  const board = usePriceBoard();
  const q = quoteMap(board.data?.stocks)[symbol];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Swap</h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Buy, sell, or trade stocks on Base. Only stocks on the official list are supported.
        </p>
      </div>
      <Select value={symbol} onValueChange={(v) => setSymbol(v as StockSymbol)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STOCKS.map((s) => (
            <SelectItem key={s.symbol} value={s.symbol}>
              {s.symbol} · {s.company}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TradeTicket symbol={symbol} quote={q} />
    </div>
  );
}

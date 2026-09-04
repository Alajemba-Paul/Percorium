import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { STOCKS, type StockSymbol } from "@/lib/percorium/constants";
import { createSlab } from "@/lib/percorium/indices";
import { normalizeWeights } from "@/lib/percorium/nav";
import { useAccount } from "wagmi";
import { useEligibility } from "@/hooks/use-board";
import { StockMark } from "@/components/stock-mark";

export const Route = createFileRoute("/indices_/create")({
  component: CreateIndex,
});

function CreateIndex() {
  const nav = useNavigate();
  const { address } = useAccount();
  const { restricted } = useEligibility();
  const [name, setName] = useState("Mag 4");
  const [symbol, setSymbol] = useState("MAG4");
  const [selected, setSelected] = useState<StockSymbol[]>([
    "NVDAc",
    "AAPLc",
    "GOOGLc",
  ]);
  const [weights, setWeights] = useState<Partial<Record<StockSymbol, number>>>({
    NVDAc: 40,
    AAPLc: 35,
    GOOGLc: 25,
  });

  const normalized = useMemo(() => normalizeWeights(weights), [weights]);
  const count = selected.length;
  const valid = count >= 2 && count <= 10 && name.trim() && symbol.trim();

  function toggle(sym: StockSymbol) {
    setSelected((cur) => {
      const on = cur.includes(sym);
      if (on && cur.length <= 2) return cur;
      if (!on && cur.length >= 10) return cur;
      const next = on ? cur.filter((s) => s !== sym) : [...cur, sym];
      setWeights((w) => {
        const copy = { ...w };
        if (on) delete copy[sym];
        else copy[sym] = 10;
        const even = 100 / next.length;
        for (const k of next) copy[k] = even;
        return copy;
      });
      return next;
    });
  }

  function create() {
    if (restricted) {
      toast.error("Minting is disabled for restricted jurisdictions.");
      return;
    }
    const slab = createSlab({
      name,
      symbol,
      creator: address ?? "workshop",
      weights,
    });
    toast.success(`${slab.symbol} slab created`);
    nav({ to: "/indices/$id", params: { id: slab.id } });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">New index</h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          2–10 official Coinbase names. Weights rebalance to 100%. Launch NAV
          is 1.00 USDC. Factory source is in the repo; this workshop tracks the
          slab locally until deploy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input
            className="mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>Symbol</Label>
          <Input
            className="mt-1.5 font-mono uppercase"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div>
        <Label>Constituents</Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STOCKS.map((s) => {
            const on = selected.includes(s.symbol);
            return (
              <button
                key={s.symbol}
                type="button"
                onClick={() => toggle(s.symbol)}
                className={
                  "flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm shadow-border " +
                  (on ? "bg-primary text-primary-foreground" : "bg-card")
                }
              >
                <StockMark symbol={s.symbol} size="sm" />
                <span>
                  {s.symbol}
                  <span className="mt-0.5 block text-[11px] opacity-70">
                    {s.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-xl bg-card p-5 shadow-border">
        {selected.map((sym) => (
          <div key={sym} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3">
            <span className="font-mono text-sm">{sym}</span>
            <Slider
              min={1}
              max={80}
              step={1}
              value={[weights[sym] ?? 1]}
              onValueChange={([v]) =>
                setWeights((w) => ({ ...w, [sym]: v ?? 1 }))
              }
            />
            <span className="text-right font-mono text-sm tabular-nums">
              {Math.round((normalized[sym] ?? 0) * 100)}%
            </span>
          </div>
        ))}
      </div>

      <Button className="w-full" disabled={!valid || restricted} onClick={create}>
        Launch at 1.00 USDC NAV
      </Button>
    </div>
  );
}

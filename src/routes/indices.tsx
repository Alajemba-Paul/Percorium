import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BasketBuilder } from "@/components/basket-builder";
import { PresetIndices } from "@/components/preset-indices";
import type { PresetBasket } from "@/lib/percorium/presets";

export const Route = createFileRoute("/indices")({ component: IndicesPage });

function IndicesPage() {
  const [activePreset, setActivePreset] = useState<PresetBasket | null>(null);

  const handleSelectPreset = (preset: PresetBasket) => {
    setActivePreset(preset);
    const builderEl = document.getElementById("custom-curation-builder");
    if (builderEl) {
      builderEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
          Stock Baskets &amp; Indices
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Browse official preset indices (such as Mag 7 and Big Tech) or curate custom multi-stock portfolios of official Coinbase B20 tokenized stocks on Base.
        </p>
      </div>

      {/* 1. Preset Stock Indices */}
      <PresetIndices onSelectPreset={handleSelectPreset} />

      {/* Divider */}
      <div className="border-t border-border/80" />

      {/* 2. Custom Basket Curation */}
      <BasketBuilder selectedPreset={activePreset} />
    </div>
  );
}

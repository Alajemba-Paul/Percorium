import { MessageSquareLock, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listMessages, postMessage, type ChatMessage } from "@/lib/percorium/chat";
import { fetchBalance } from "@/lib/percorium/prices";
import { useDemoStore } from "@/lib/percorium/demo-store";
import { formatRelative, shortAddress } from "@/lib/percorium/format";
import { Label } from "@/components/ui/label";

export function HoldersChat({
  room,
  asset,
  label,
}: {
  room: string;
  asset: `0x${string}` | "index";
  label: string;
}) {
  const { address } = useAccount();
  const { demoHoldings, setDemoHolding } = useDemoStore();
  const [onchain, setOnchain] = useState(0);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const demo = demoHoldings[room] ?? 0;

  useEffect(() => {
    setMsgs(listMessages(room));
  }, [room]);

  useEffect(() => {
    if (!address || asset === "index") return;
    let cancelled = false;
    fetchBalance({ data: { owner: address, token: asset } })
      .then((b) => {
        if (!cancelled) setOnchain(b.units);
      })
      .catch(() => {
        if (!cancelled) setOnchain(0);
      });
    return () => {
      cancelled = true;
    };
  }, [address, asset]);

  const holding = Math.max(onchain, demo);
  const allowed = holding > 0;
  const from = address ? shortAddress(address) : "demo-wallet";

  const tier = useMemo(() => {
    if (holding >= 10) return "10+";
    if (holding >= 1) return "1+";
    return "0";
  }, [holding]);

  function send() {
    const res = postMessage({ room, from, text, holding });
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setError(null);
    setText("");
    setMsgs(listMessages(room));
  }

  return (
    <section className="rounded-xl bg-card p-5 shadow-border">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Holders chat</h2>
          <p className="text-sm text-muted-foreground">
            {label} · gate is onchain balanceOf {">"} 0
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {allowed ? `tier ${tier}` : "locked"}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-elevated px-3 py-2">
        <Label htmlFor={`demo-${room}`} className="text-xs">
          Simulate holding for demo
        </Label>
        <Switch
          id={`demo-${room}`}
          checked={demo > 0}
          onCheckedChange={(v) => setDemoHolding(room, v ? 1.25 : 0)}
        />
      </div>

      {!allowed ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-elevated p-4">
          <MessageSquareLock className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Holders only</p>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              Zero balance. Access dropped. Buy this name (or mint the index)
              to enter the room. No public lurkers.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {msgs.map((m) => (
              <li key={m.id} className="rounded-lg bg-elevated p-3">
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{m.from}</span>
                  <span>{formatRelative(m.at / 1000)}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed">{m.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              rows={2}
              value={text}
              placeholder="Message holders"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button onClick={send} className="self-end">
              <Send className="size-4" />
              Send
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

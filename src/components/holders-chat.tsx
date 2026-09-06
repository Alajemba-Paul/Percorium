import { MessageSquareLock, Send, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listMessages, postMessage, type ChatMessage } from "@/lib/percorium/chat";
import { fetchBalance } from "@/lib/percorium/prices";
import { formatRelative, shortAddress } from "@/lib/percorium/format";
import { useStockBalances } from "@/hooks/use-balances";
import type { StockSymbol } from "@/lib/percorium/constants";

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
  const balances = useStockBalances();
  const [onchain, setOnchain] = useState(0);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMsgs(listMessages(room));
  }, [room]);

  useEffect(() => {
    if (!address || asset === "index") return;
    // If it's a known stock, the balance is already in balances.stocks
    if (room in balances.stocks) {
      setOnchain(balances.stocks[room as StockSymbol]?.units ?? 0);
      return;
    }
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
  }, [address, asset, room, balances.stocks]);

  const stockBal = room in balances.stocks ? balances.stocks[room as StockSymbol]?.units ?? 0 : 0;
  const holding = Math.max(stockBal, onchain);
  const allowed = Boolean(address) && holding > 0;
  const from = address ? shortAddress(address) : "";

  function send() {
    if (!allowed || !address) return;
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
    <section className="rounded-xl bg-[#131511] border border-[#262923] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#262923] pb-3">
        <div>
          <h2 className="font-['Instrument_Serif',serif] text-xl text-[#f1f0e8]">Holders Chat</h2>
          <p className="text-xs text-[#8f9388] font-['IBM_Plex_Mono',monospace]">
            {label} &middot; Only open to holders of {room} on Base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allowed ? (
            <span className="rounded bg-[#6f9a72]/15 border border-[#6f9a72]/30 px-2 py-0.5 font-['IBM_Plex_Mono',monospace] text-[11px] text-[#6f9a72] font-semibold">
              Verified Holder &middot; {holding.toFixed(2)} {room}
            </span>
          ) : (
            <span className="rounded bg-[#262923] px-2 py-0.5 font-['IBM_Plex_Mono',monospace] text-[11px] text-[#8f9388] flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Holders Only</span>
            </span>
          )}
        </div>
      </div>

      {!allowed ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-[#1a1d18] border border-[#262923] p-5">
          <MessageSquareLock className="size-5 text-[#cfd8c6]" />
          <div>
            <p className="text-sm font-semibold text-[#f1f0e8]">
              {address ? `No ${room} in wallet` : "Wallet not connected"}
            </p>
            <p className="mt-1 text-xs text-[#8f9388] leading-relaxed">
              {address
                ? `Your wallet (${shortAddress(address)}) holds no ${room} on Base. Buy shares on the Spot Desk to join this chat.`
                : `Connect your Base wallet holding ${room} to join the chat.`}
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
              placeholder="Write a message..."
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button onClick={send} className="self-end">
              <Send className="size-4" />
              Send Message
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

import { ChevronDown, Wallet, Unplug } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortAddress, formatNum } from "@/lib/percorium/format";
import { useStockBalances } from "@/hooks/use-balances";

export function WalletButton() {
  const { address, isConnected, connector } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const balances = useStockBalances();

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-0 gap-2 font-mono text-xs">
            <span className="size-1.5 rounded-full bg-success" />
            {shortAddress(address)}
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="space-y-0.5">
            <div>{connector?.name ?? "Wallet"} · Base</div>
            <div className="font-mono text-xs text-muted-foreground font-normal">
              {formatNum(balances.usdc.units, 2)} USDC
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()}>
            <Unplug className="mr-2 size-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const unique = connectors.filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Wallet className="size-4" />
          {isPending ? "Connecting" : "Connect"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Base wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unique.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => connect({ connector: c, chainId: 8453 })}
          >
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

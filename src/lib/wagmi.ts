import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { BASE_RPC_FALLBACKS } from "@/lib/percorium/constants";

const rpc =
  (typeof process !== "undefined" && process.env.BASE_RPC) ||
  BASE_RPC_FALLBACKS[0];

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: "Percorium",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: http(rpc),
  },
  ssr: true,
});

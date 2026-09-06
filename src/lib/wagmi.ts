import { createConfig, fallback, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { BASE_RPC_FALLBACKS } from "@/lib/percorium/constants";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Percorium",
      preference: { options: "all" },
    }),
  ],
  transports: {
    [base.id]: fallback(
      BASE_RPC_FALLBACKS.map((url) => http(url, { timeout: 10_000 })),
    ),
  },
  ssr: true,
});

# Percorium

Base-native aggregator and portfolio layer for **official Coinbase Tokenized Stocks (B20)**.

Real 1:1 custodied shares — not synthetics, not a perp casino. Percorium does **not** issue stocks. Coinbase does. This app routes official B20 contract addresses, composes fully-backed index slabs, and wires Base DeFi.

**Non-US only.** US-person trading is out of scope. Every swap, mint, and borrow fail-closes on geo, a stale/paused Chainlink feed, or a down Base sequencer.

Chain: **Base mainnet `8453`**. Quote asset: **USDC** [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913).

## Base Builder Quest

Built for [Build a project that helps people trade or use Coinbase Tokenized Stocks on Base](https://www.base.org/build). Maps to Request-for-Builders:

| Feature | RfB category |
| --- | --- |
| Discover + 0x buy/sell/swap of allowlisted B20 | **Neobrokerages** |
| Isolated ERC-4626 index slabs, 2–10 names, NAV = 1.00 USDC at T0 | **Personalized Index Creation** |
| Morpho Blue isolated supply/borrow when a market exists | **Yield/Credit on productive assets** |
| DexScreener / GeckoTerminal charts + AMM vs Chainlink basis | Spot desk |
| Token-gated holders chat (`balanceOf > 0`) | Holder community on each name |

## Official B20 allowlist

Tokens are identified by **contract address**, never ticker alone. If it is not in `CB_STOCKS` / registry [`0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`](https://basescan.org/address/0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD), Coinbase did not issue it and Percorium will not trade or chart it.

See [`src/lib/percorium/constants.ts`](src/lib/percorium/constants.ts).

NAV and LTV use Chainlink Coinbase equity total-return feeds (8 decimals, 24/5). AMM mid is shown as premium/discount, never as the risk price.

## What Phase 1 proves

1. **Discover** — official B20 names, Chainlink price, feed health, sequencer, DexScreener 24h change + basis dot.
2. **Charts** — DexScreener embed of the deepest official USDC pair (Aerodrome preferred), GeckoTerminal toggle, 5m–1W timeframes, basis chip.
3. **Buy / sell / swap** — 0x v2 primary, 1inch v6.1 fallback. Rejects any token not in the allowlist.
4. **Index workshop** — compose weights, mint/redeem against Chainlink NAV. Solidity factory + slab in `contracts/`.
5. **Credit** — Morpho market discovery at runtime. Hidden if no market. Isolated LTV. No cross-margin.
6. **Holders chat** — gated on onchain `balanceOf`. Zero balance is rejected.

## Local setup

```bash
git clone https://github.com/Alajemba-Paul/Percorium.git
cd Percorium
cp .env.example .env.local   # optional — names only, fill what you have
npm install
npm run dev
```

Dev server: Vite + TanStack Start on port 8080. Production build is Nitro’s Vercel preset (`npm run build`).

Without 0x / 1inch keys the ticket still quotes Chainlink-indicative size and **refuses to execute**.

## Environment variables

Names only. Do not put secrets in git. Set the same keys in Vercel → Settings → Environment Variables for Production + Preview.

```
NEXT_PUBLIC_CDP_CLIENT_API_KEY
NEXT_PUBLIC_WC_PROJECT_ID
NEXT_PUBLIC_CHAIN=base
ZERO_EX_API_KEY
ONEINCH_API_KEY
BASE_RPC
CRON_SECRET
```

## Stack

TanStack Start (Vite + Nitro), wagmi / viem, Base-only. Swap path 0x → 1inch. Prices via `AggregatorV3Interface.latestRoundData()`. Charts via DexScreener pair lookup (address, not ticker) + GeckoTerminal embed of the same pool.

## Contracts

- [`contracts/IndexSlab.sol`](contracts/IndexSlab.sol) — isolated inventory vault
- [`contracts/IndexFactory.sol`](contracts/IndexFactory.sol) — create slabs
- B20Factory is **read-only**. This app never calls `createB20`.

Workshop mints run locally until the factory is deployed onchain.

## Loom

See [`LOOM.md`](LOOM.md).

## License

MIT. See [`LICENSE`](LICENSE).

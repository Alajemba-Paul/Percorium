# Percorium Security Policy

This document details the security architecture, threat model, oracle dependencies, regulatory enforcement mechanisms, and vulnerability disclosure process for **Percorium** on Base (`chainId: 8453`).

---

## 1. System Overview

Percorium is a Base-native interface and DeFi portfolio layer designed exclusively for **official Coinbase Tokenized Stocks (B20)**. Percorium is **not** an issuer or custodian of tokenized stocks. All stocks are issued by Coinbase and backed 1:1 with underlying shares.

The core protocol layer consists of:
- **Spot Swaps**: 0x API v2 and 1inch v6.1 router integrations to Base liquidity pools (Aerodrome USDC pairs).
- **Asset Allowlist**: Strict verification against Coinbase B20 Registry (`0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD`).
- **ERC-4626 Slabs**: Isolated index vaults holding verified Coinbase B20 tokens and USDC reserves.
- **Credit Integration**: Runtime discovery of isolated Morpho Blue lending markets.
- **Token-Gated Community**: Balance-checked chat for verified onchain asset holders.

---

## 2. Threat Model & Mitigations

### 2.1 Asset Spoofing & Lookalike Tokens
* **Threat**: Malicious actors deploy fake ERC-20 tokens with identical ticker symbols (e.g., `AAPLc`, `NVDAc`, `TSLAc`) or fake B20 factories to trick users into buying unbacked tokens.
* **Mitigation**:
  - Tokens are identified strictly by **contract address**, never by ticker symbol alone.
  - The frontend, server functions, and smart contracts assert token addresses against the static `CB_STOCKS` canonical allowlist (`STOCK_BY_ADDRESS`).
  - Swaps, index creations, and portfolio views reject any token not present in the allowlist.

### 2.2 Malicious Calldata & Spender Hijacking
* **Threat**: Aggregator API compromise or man-in-the-middle attacks injecting arbitrary execution targets or spender approvals.
* **Mitigation**:
  - Percorium validates all swap route calldata against `TRUSTED_ROUTERS_AND_SPENDERS`:
    - 0x AllowanceHolder: `0x0000000000001fF3684f28c67538d4D072C22734`
    - Uniswap Permit2: `0x00022D3A4739920c6ae4291843700d7664D9fEB1`
    - 1inch Router v6: `0x111111125421cA6dc452d289314280a0f8842A65`
    - Aerodrome Router: `0xcF77a3Ba9A5CA399B7c97c748846911387219558`
  - Any calldata instructing approvals or calls to non-whitelisted addresses is aborted before signing.

### 2.3 Sandwich Attacks & Front-Running
* **Threat**: MEV searchers sandwiching low-liquidity stock trades on Base DEXes.
* **Mitigation**:
  - Enforced slippage bounds (minimum 5 bps / 0.05%, maximum 300 bps / 3.0%). Requests exceeding safe bounds fail validation.
  - Continuous calculation and display of the AMM-to-Oracle basis (premium / discount) so users avoid executing trades against distorted liquidity.

### 2.4 Cross-Contagion & Bad Debt
* **Threat**: Exploits or depegs in one token compromising other protocol positions.
* **Mitigation**:
  - Index vaults (`IndexSlab.sol`) are strictly isolated ERC-4626 contracts with independent inventory and reserves.
  - Lending markets leverage Morpho Blue's isolated market architecture (single collateral, single loan asset, specific LLTV). There is no shared cross-margin pool.

### 2.5 Web & Client-Side Attacks
* **Threat**: XSS, script injection, or unauthorized external data exfiltration.
* **Mitigation**:
  - Enforced Content Security Policy (CSP) headers in production (`vercel.json` and Nitro server middleware `server/middleware/00-csp.ts`) restricting scripts, frames, and network connections to trusted domains (0x, DexScreener, Morpho, official Base RPCs).
  - Sanitization of token-gated chat messages removing HTML entities, control characters, and bounding lengths to 280 characters.

---

## 3. Geo-Restriction & Compliance Limitations

### 3.1 Policy & Intended Scope
Percorium is intended **strictly for non-US persons** and individuals outside OFAC-sanctioned jurisdictions (Cuba, Iran, North Korea, Syria, Crimea, Donetsk, Luhansk regions). Trading Coinbase Tokenized Stocks is prohibited for US persons under applicable securities regulations.

### 3.2 Enforcement Layers
1. **Edge Country Headers**: Server endpoints read trusted edge geolocation headers (`x-vercel-ip-country`, `cf-ipcountry`, `cloudfront-viewer-country`).
2. **Client Geolocation Check**: The application validates IP location on boot via geolocation services.
3. **User Attestation**: Users must explicitly acknowledge non-US status and terms before unlocking trading interactions.
4. **Fail-Closed Execution**: If any header or check resolves to `US` or a restricted region, trading tickets and minting workflows immediately fail-closed.

### 3.3 Known Limitations (Threat Realism)
* **VPNs & Proxies**: IP-based geolocation and Edge headers can be masked or bypassed by users using Virtual Private Networks (VPNs), residential proxies, Tor, or remote desktop infrastructure.
* **Permissionless Smart Contracts**: Onchain smart contracts on Base execute in a permissionless EVM environment. While the Percorium frontend and API routes enforce strict access controls and deny service to US persons, contract calls made directly to external DEXes or onchain vaults bypass interface-level geo-filters.

---

## 4. Oracle Dependency & Fail-Closed Logic

Percorium relies on Chainlink oracles on Base to ensure accurate valuations and safeguard users against executing trades or loans during market distortions.

### 4.1 Chainlink Total Return Feeds
* Feeds report 8-decimal USD valuations for each underlying stock.
* Equity markets operate on a 24/5 schedule. When US markets close for weekends or holidays, feeds reflect the last closing price.

### 4.2 L2 Sequencer Uptime Feed
* Base uses the Chainlink Sequencer Uptime Feed: `0xBCF85224fc0756B9Fa45aA7892530B47e10b6433`.
* **Downtime**: If the sequencer is reported down (`answer !== 0`), all quote generation, trading, and minting fail-closed immediately.
* **Grace Period**: Following a sequencer restart, a mandatory **3,600-second (1 hour)** grace period is enforced (`SEQUENCER_GRACE_SEC`) before trade execution can resume, preventing liquidation cascades and stale price exploitation during network recovery.

### 4.3 Feed Freshness & Heartbeats
* **Normal Operation (`live`)**: Feed updated within 86,400 seconds (`FEED_STALE_SEC`).
* **Market Close (`holding`)**: During weekends or official holidays, aged feeds are treated as holding the last verified close.
* **Stale Feed (`stale`)**: Missed heartbeat during an active US trading session fails-closed.
* **Paused Feed (`paused`)**: Feeds older than 172,800 seconds (`FEED_PAUSE_SEC`) or returning non-positive prices are marked paused, preventing mints, redeems, and trades.

### 4.4 Oracle vs. AMM Price Separation
Percorium strictly separates risk pricing from execution pricing:
* **NAV & Collateral Valuation**: Computed exclusively from Chainlink oracles.
* **Execution Price**: Derived from 0x/1inch aggregator routes and AMM pools.
* **Basis Monitoring**: Any significant divergence between the AMM execution price and Chainlink NAV is flagged to the user prior to trade confirmation.

---

## 5. Responsible Vulnerability Disclosure

We welcome vulnerability reports from security researchers and developers to help keep Percorium and its users safe.

### 5.1 Reporting a Vulnerability
If you discover a security vulnerability, please report it via private email:

* **Email**: `security@percorium.xyz` (or `seyialajemba@gmail.com`)
* **Subject**: `[SECURITY VULNERABILITY] Percorium - <Brief Description>`
* **PGP Encryption**: If sending sensitive proof-of-concept data, please request our PGP public key prior to sending the details.

Please include:
1. Clear description of the vulnerability and potential impact.
2. Step-by-step reproduction steps or proof-of-concept (PoC) code.
3. Relevant contract addresses, transactions, or endpoints.
4. Suggested remediation or mitigation steps (if available).

### 5.2 Response & Remediation Timelines
* **Initial Acknowledgment**: Within **24 to 48 hours** of report receipt.
* **Triage & Assessment**: Within **3 to 5 business days**.
* **Remediation & Patching**: Critical issues will be patched and deployed as quickly as possible. We will keep the reporter updated on progress.
* **Public Disclosure**: Coordinated disclosure after the issue is resolved and verified.

### 5.3 Safe Harbor Policy
If you conduct security research in good faith:
- We will not pursue legal action or file complaints against researchers acting in accordance with these guidelines.
- Do not exploit vulnerabilities to access user funds, extract private data, or disrupt production services.
- Always use test accounts and testnet/fork environments where possible.
- Give us reasonable time to investigate and fix the issue before sharing any details publicly.

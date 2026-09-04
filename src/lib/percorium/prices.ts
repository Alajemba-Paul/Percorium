import { createServerFn } from "@tanstack/react-start";
import { AGGREGATOR_V3_ABI, B20_ABI } from "./abis";
import {
  CHAINLINK_SEQUENCER_UPTIME,
  FEED_PAUSE_SEC,
  FEED_STALE_SEC,
  SEQUENCER_GRACE_SEC,
  STOCKS,
  type StockSymbol,
} from "./constants";
import { isUsEquitySession } from "./format";
import { getPublicClient, rpcUrl } from "./rpc";
import type { FeedStatus, PriceBoard, SequencerState, StockQuote } from "./types";

function statusFor(updatedAt: number): FeedStatus {
  const age = Date.now() / 1000 - updatedAt;
  const session = isUsEquitySession();
  if (age > FEED_PAUSE_SEC) return "paused";
  if (age > FEED_STALE_SEC && session.weekday) return "stale";
  if (!session.weekday || age > FEED_STALE_SEC) return "holding";
  return "live";
}

export const fetchPriceBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<PriceBoard> => {
    const client = getPublicClient();
    const fetchedAt = Date.now();
    try {
      const sequencerRaw = await client.readContract({
        address: CHAINLINK_SEQUENCER_UPTIME,
        abi: AGGREGATOR_V3_ABI,
        functionName: "latestRoundData",
      });
      const seqAnswer = sequencerRaw[1];
      const seqStarted = Number(sequencerRaw[2]);
      const up = seqAnswer === 0n;
      const grace =
        up && Date.now() / 1000 - seqStarted < SEQUENCER_GRACE_SEC && seqStarted > 0;
      const sequencer: SequencerState = { up, startedAt: seqStarted, grace };

      const roundCalls = STOCKS.map((s) => ({
        address: s.feed,
        abi: AGGREGATOR_V3_ABI,
        functionName: "latestRoundData" as const,
      }));
      const multiplierCalls = STOCKS.map((s) => ({
        address: s.address,
        abi: B20_ABI,
        functionName: "multiplier" as const,
      }));

      const [rounds, multipliers] = await Promise.all([
        client.multicall({ contracts: roundCalls, allowFailure: true }),
        client.multicall({ contracts: multiplierCalls, allowFailure: true }),
      ]);

      const stocks: StockQuote[] = STOCKS.map((s, i) => {
        const r = rounds[i];
        let oracle = 0;
        let updatedAt = 0;
        let roundId = "0";
        if (r.status === "success") {
          const [, answer, , updated, round] = r.result;
          oracle = Number(answer) / 1e8;
          updatedAt = Number(updated);
          roundId = round.toString();
        }
        const m = multipliers[i];
        const multiplier =
          m.status === "success" ? Number(m.result) / 1e18 : null;
        return {
          symbol: s.symbol as StockSymbol,
          address: s.address,
          feed: s.feed,
          oracle,
          updatedAt,
          roundId,
          status: oracle ? statusFor(updatedAt) : "paused",
          multiplier,
          amm: null,
          basisBps: null,
        };
      });

      return { sequencer, stocks, fetchedAt, rpc: rpcUrl() };
    } catch (err) {
      return {
        sequencer: { up: false, startedAt: 0, grace: false },
        stocks: STOCKS.map((s) => ({
          symbol: s.symbol,
          address: s.address,
          feed: s.feed,
          oracle: 0,
          updatedAt: 0,
          roundId: "0",
          status: "paused" as const,
          multiplier: null,
          amm: null,
          basisBps: null,
        })),
        fetchedAt,
        rpc: rpcUrl(),
        error: err instanceof Error ? err.message : "RPC error",
      };
    }
  },
);

export const fetchBalance = createServerFn({ method: "POST" })
  .validator((d: { owner: `0x${string}`; token: `0x${string}` }) => d)
  .handler(async ({ data }) => {
    const client = getPublicClient();
    try {
      const [raw, scaled] = await Promise.all([
        client.readContract({
          address: data.token,
          abi: B20_ABI,
          functionName: "balanceOf",
          args: [data.owner],
        }),
        client
          .readContract({
            address: data.token,
            abi: B20_ABI,
            functionName: "scaledBalanceOf",
            args: [data.owner],
          })
          .catch(() => 0n),
      ]);
      return {
        raw: raw.toString(),
        scaled: scaled.toString(),
        units: Number(raw) / 1e18,
      };
    } catch (err) {
      return {
        raw: "0",
        scaled: "0",
        units: 0,
        error: err instanceof Error ? err.message : "balance failed",
      };
    }
  });

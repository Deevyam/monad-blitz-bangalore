"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  FACTORY_ABI,
  FACTORY_ADDRESS,
  FACTORY_CONFIGURED,
  MARKET_ABI,
} from "@/constants/contracts";

export type MarketStatus = "open" | "closed" | "resolved";

export interface Market {
  address: `0x${string}`;
  question: string;
  yesPool: bigint;
  noPool: bigint;
  resolved: boolean;
  outcome: boolean;
  deadline: bigint;
  status: MarketStatus;
}

/**
 * Reads every market from the factory and bundles its state. Polls every 500ms
 * to match Monad's ~500ms block time so pool sizes and resolutions appear live.
 */
export function useMarkets() {
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const fetchMarkets = useCallback(async () => {
    if (!publicClient || !FACTORY_CONFIGURED) {
      setLoading(false);
      return;
    }
    // Avoid overlapping polls if a read is slow.
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const addresses = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "getMarkets",
      });

      const now = BigInt(Math.floor(Date.now() / 1000));

      const results = await Promise.all(
        addresses.map(async (address): Promise<Market> => {
          const [question, deadline, yesPool, noPool, resolved, outcome] =
            await publicClient.readContract({
              address,
              abi: MARKET_ABI,
              functionName: "getMarketInfo",
            });

          let status: MarketStatus;
          if (resolved) status = "resolved";
          else if (now >= deadline) status = "closed";
          else status = "open";

          return {
            address,
            question,
            yesPool,
            noPool,
            resolved,
            outcome,
            deadline,
            status,
          };
        })
      );

      setMarkets(results);
    } catch (err) {
      // Network hiccups should not blow away the last good data.
      console.error("Failed to load markets:", err);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    void fetchMarkets();
    const id = setInterval(() => {
      void fetchMarkets();
    }, 500);
    return () => clearInterval(id);
  }, [fetchMarkets]);

  return { markets, loading, refetch: fetchMarkets };
}

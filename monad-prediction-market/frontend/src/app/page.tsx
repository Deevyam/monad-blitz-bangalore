"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { FACTORY_ABI, FACTORY_ADDRESS, FACTORY_CONFIGURED } from "@/constants/contracts";
import { monadTestnet } from "@/lib/wagmiConfig";
import { shortAddress } from "@/lib/format";
import { useMarkets, type Market } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { BetModal } from "@/components/BetModal";
import { CreateMarketForm } from "@/components/CreateMarketForm";
import { AdminPanel } from "@/components/AdminPanel";

function useBlockTicker() {
  const publicClient = usePublicClient();
  const [block, setBlock] = useState<bigint | null>(null);

  useEffect(() => {
    if (!publicClient) return;
    let active = true;
    const tick = async () => {
      try {
        const b = await publicClient.getBlockNumber();
        if (active) setBlock(b);
      } catch {
        /* ignore transient RPC errors */
      }
    };
    void tick();
    const id = setInterval(tick, 500);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [publicClient]);

  return block;
}

function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongChain = isConnected && chainId !== monadTestnet.id;

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        className="rounded-xl bg-monad-purple px-4 py-2 font-semibold text-white transition hover:brightness-110"
      >
        Connect Wallet
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-black transition hover:brightness-110"
      >
        Switch to Monad
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="rounded-xl border border-monad-border bg-monad-panel px-4 py-2 font-mono text-sm transition hover:bg-white/5"
    >
      {address ? shortAddress(address) : "Connected"}
    </button>
  );
}

export default function Home() {
  const block = useBlockTicker();
  const { address, isConnected } = useAccount();
  const { markets, loading } = useMarkets();

  const [bet, setBet] = useState<{ market: Market; side: boolean } | null>(null);

  const { data: factoryOwner } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "owner",
    query: { enabled: FACTORY_CONFIGURED },
  });

  const isOwner =
    isConnected &&
    !!address &&
    !!factoryOwner &&
    address.toLowerCase() === factoryOwner.toLowerCase();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Monad Prediction Markets
          </h1>
          <p className="text-sm text-gray-400">
            Bet MON on YES/NO outcomes · resolve many markets in one block.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-lg border border-monad-border bg-monad-panel px-3 py-2 font-mono text-sm text-emerald-300">
            Block: {block !== null ? block.toString() : "…"}
          </span>
          <WalletButton />
        </div>
      </header>

      {!FACTORY_CONFIGURED && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          No factory address configured. Deploy the contracts and set{" "}
          <code>FACTORY_ADDRESS</code> in{" "}
          <code>src/constants/contracts.ts</code> (or{" "}
          <code>NEXT_PUBLIC_FACTORY_ADDRESS</code> in <code>.env.local</code>).
        </div>
      )}

      {/* Admin (owner only) */}
      {isOwner && (
        <div className="mb-6">
          <AdminPanel markets={markets} />
        </div>
      )}

      {/* Create */}
      <div className="mb-8">
        <CreateMarketForm />
      </div>

      {/* Markets grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-monad-border bg-monad-panel/60"
            />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <p className="rounded-2xl border border-monad-border bg-monad-panel p-8 text-center text-gray-400">
          No markets yet — create one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <MarketCard
              key={m.address}
              market={m}
              onBet={(market, side) => setBet({ market, side })}
            />
          ))}
        </div>
      )}

      {bet && (
        <BetModal
          market={bet.market}
          side={bet.side}
          onClose={() => setBet(null)}
        />
      )}
    </main>
  );
}

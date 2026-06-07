"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { MARKET_ABI } from "@/constants/contracts";
import { countdown, formatMon } from "@/lib/format";
import type { Market } from "@/hooks/useMarkets";

interface Props {
  market: Market;
  onBet: (market: Market, side: boolean) => void;
}

const STATUS_STYLES: Record<Market["status"], string> = {
  open: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  closed: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  resolved: "bg-gray-500/15 text-gray-300 border-gray-500/40",
};

export function MarketCard({ market, onBet }: Props) {
  const { address, isConnected } = useAccount();
  const [, forceTick] = useState(0);

  // Re-render once a second so the countdown stays live.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const total = market.yesPool + market.noPool;
  const yesPct =
    total > 0n ? Number((market.yesPool * 10000n) / total) / 100 : 50;
  const noPct = 100 - yesPct;

  // Read the connected user's winning stake to decide whether to show Claim.
  const winningSide = market.outcome; // true => YES won
  const { data: userStake } = useReadContract({
    address: market.address,
    abi: MARKET_ABI,
    functionName: winningSide ? "yesBets" : "noBets",
    args: address ? [address] : undefined,
    query: { enabled: market.resolved && isConnected && !!address },
  });
  const { data: hasClaimed } = useReadContract({
    address: market.address,
    abi: MARKET_ABI,
    functionName: "claimed",
    args: address ? [address] : undefined,
    query: { enabled: market.resolved && isConnected && !!address },
  });

  const canClaim =
    market.resolved &&
    isConnected &&
    typeof userStake === "bigint" &&
    userStake > 0n &&
    hasClaimed === false;

  const { writeContract, data: claimHash, isPending, error } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimDone } =
    useWaitForTransactionReceipt({ hash: claimHash });

  const disabled = market.status !== "open";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-monad-border bg-monad-panel p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">{market.question}</h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[market.status]}`}
        >
          {market.status}
        </span>
      </div>

      {/* Pool bars */}
      <div className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full bg-monad-purple transition-all"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="h-full bg-monad-coral transition-all"
            style={{ width: `${noPct}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-monad-purple">
            YES {formatMon(market.yesPool)} MON
          </span>
          <span className="text-monad-coral">
            NO {formatMon(market.noPool)} MON
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Total pool: {formatMon(total)} MON</span>
        {market.status === "open" && (
          <span>Closes in {countdown(market.deadline)}</span>
        )}
      </div>

      {/* Resolved winner badge */}
      {market.resolved && (
        <div
          className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${
            market.outcome
              ? "bg-monad-purple/20 text-monad-purple"
              : "bg-monad-coral/20 text-monad-coral"
          }`}
        >
          {market.outcome ? "YES WON" : "NO WON"}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBet(market, true)}
          disabled={disabled}
          className="rounded-xl bg-monad-purple px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Bet YES
        </button>
        <button
          onClick={() => onBet(market, false)}
          disabled={disabled}
          className="rounded-xl bg-monad-coral px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Bet NO
        </button>
      </div>

      {canClaim && (
        <button
          onClick={() =>
            writeContract({
              address: market.address,
              abi: MARKET_ABI,
              functionName: "claim",
            })
          }
          disabled={isPending || claimConfirming || claimDone}
          className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {claimDone
            ? "Claimed ✓"
            : isPending || claimConfirming
              ? "Claiming…"
              : "Claim Payout"}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400">
          {error.message.split("\n")[0]}
        </p>
      )}
    </div>
  );
}

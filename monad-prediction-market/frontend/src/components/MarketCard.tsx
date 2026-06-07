"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { MARKET_ABI } from "@/constants/contracts";
import { countdown, formatMon } from "@/lib/format";
import type { Market } from "@/hooks/useMarkets";

interface Props {
  market: Market;
  onBet: (market: Market, side: boolean) => void;
  onAskAI: (market: Market) => void;
  onVerifyAI: (market: Market) => void;
}

const STATUS_STYLES: Record<Market["status"], string> = {
  open: "bg-emerald-50 text-emerald-600 border-emerald-100",
  closed: "bg-amber-50 text-amber-600 border-amber-100",
  resolved: "bg-gray-100 text-gray-600 border-gray-200",
};

export function MarketCard({ market, onBet, onAskAI, onVerifyAI }: Props) {
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

  return (
    <div className="flex flex-col justify-between gap-5 rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-md font-bold leading-snug text-gray-800 tracking-tight">{market.question}</h3>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[market.status]}`}
          >
            {market.status}
          </span>
        </div>

        {/* Pool Progress Bars */}
        <div className="space-y-2.5 bg-[#F8F9FA] p-3 rounded-2xl border border-[#EEF2F6]">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-gray-500">Prediction Ratios</span>
            <span className="text-gray-900 font-bold">{yesPct.toFixed(0)}% YES vs {noPct.toFixed(0)}% NO</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-[#5F45FF] to-[#8C76FF] transition-all duration-300"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-[#FF5656] to-[#FFA0A0] transition-all duration-300"
              style={{ width: `${noPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium pt-1">
            <span className="text-[#5F45FF] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5F45FF]" />
              YES {formatMon(market.yesPool)} MON
            </span>
            <span className="text-[#FF5656] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF5656]" />
              NO {formatMon(market.noPool)} MON
            </span>
          </div>
        </div>

        {/* Total stats */}
        <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
          <span>Pool size: <span className="text-gray-700 font-bold">{formatMon(total)} MON</span></span>
          {market.status === "open" && (
            <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
              Closes: {countdown(market.deadline)}
            </span>
          )}
        </div>

        {/* Resolved Winner Overlay */}
        {market.resolved && (
          <div
            className={`rounded-xl px-4 py-2 text-center text-xs font-extrabold tracking-wider border ${
              market.outcome
                ? "bg-[#5F45FF]/10 text-[#5F45FF] border-[#5F45FF]/20"
                : "bg-[#FF5656]/10 text-[#FF5656] border-[#FF5656]/20"
            }`}
          >
            WINNING OUTCOME: {market.outcome ? "YES" : "NO"}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2 border-t border-[#F1F5F9]">
        {market.status === "open" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onBet(market, true)}
                className="rounded-full bg-[#5F45FF] py-2 text-xs font-bold text-white transition hover:bg-[#4834cf] active:scale-95 shadow-sm"
              >
                Bet YES
              </button>
              <button
                onClick={() => onBet(market, false)}
                className="rounded-full bg-[#FF5656] py-2 text-xs font-bold text-white transition hover:bg-[#e04545] active:scale-95 shadow-sm"
              >
                Bet NO
              </button>
            </div>
            <button
              onClick={() => onAskAI(market)}
              className="w-full flex items-center justify-center gap-1.5 rounded-full border border-[#5F45FF]/20 bg-[#5F45FF]/10 py-2.5 text-xs font-bold text-[#5F45FF] transition hover:bg-[#5F45FF]/15 active:scale-95"
            >
              <svg className="w-4 h-4 animate-pulse text-[#5F45FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM19.071 4.929l-.707 3.536-3.536.707 3.536.707.707 3.536.707-3.536 3.536-.707-3.536-.707-.707-3.536z" />
              </svg>
              Ask BlitzAgent Copilot
            </button>
          </div>
        ) : market.status === "closed" ? (
          <button
            onClick={() => onVerifyAI(market)}
            className="w-full flex items-center justify-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-500/15 active:scale-95"
          >
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Run AI Oracle Settle
          </button>
        ) : (
          <button
            onClick={() => onVerifyAI(market)}
            className="w-full flex items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 active:scale-95"
          >
            View AI Verification Report
          </button>
        )}

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
            className="w-full rounded-full border border-emerald-500/30 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {claimDone
              ? "Claimed ✓"
              : isPending || claimConfirming
                ? "Claiming…"
                : "Claim Winnings"}
          </button>
        )}

        {error && (
          <p className="text-[10px] text-red-500 text-center bg-red-50 p-2 rounded-lg mt-1">
            {error.message.split("\n")[0]}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { MARKET_ABI } from "@/constants/contracts";
import { formatMon } from "@/lib/format";
import type { Market } from "@/hooks/useMarkets";

interface Props {
  market: Market;
  side: boolean; // true = YES
  onClose: () => void;
}

export function BetModal({ market, side, onClose }: Props) {
  const [amount, setAmount] = useState("");

  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Close automatically a couple seconds after success.
  useEffect(() => {
    if (!isSuccess) return;
    const id = setTimeout(onClose, 2000);
    return () => clearTimeout(id);
  }, [isSuccess, onClose]);

  const sidePool = side ? market.yesPool : market.noPool;
  const totalPool = market.yesPool + market.noPool;

  // Estimated payout if you win:
  const estPayout = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    const amt = parseEther(amount as `${number}`);
    const newSide = sidePool + amt;
    if (newSide === 0n) return null;
    const payout = (amt * (totalPool + amt)) / newSide;
    return formatMon(payout);
  }, [amount, sidePool, totalPool]);

  const valid = Number(amount) > 0;

  function confirm() {
    if (!valid) return;
    writeContract({
      address: market.address,
      abi: MARKET_ABI,
      functionName: "bet",
      args: [side],
      value: parseEther(amount as `${number}`),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-2xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
            Betting{"  "}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${side ? "bg-[#5F45FF]/10 text-[#5F45FF]" : "bg-[#FF5656]/10 text-[#FF5656]"}`}>
              {side ? "YES" : "NO"}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Market Title */}
        <p className="mb-4 text-sm font-bold text-gray-800 leading-snug">{market.question}</p>

        {/* Current Pool Status */}
        <div className="mb-5 flex justify-between rounded-2xl bg-[#F8F9FA] border border-[#EEF2F6] px-4 py-3 text-xs font-bold">
          <span className="text-[#5F45FF]">
            YES: {formatMon(market.yesPool)} MON
          </span>
          <span className="text-[#FF5656]">
            NO: {formatMon(market.noPool)} MON
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (MON)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              reset();
            }}
            placeholder="0.10"
            className="w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#5F45FF] focus:bg-white focus:ring-1 focus:ring-[#5F45FF] transition"
          />
        </div>

        {/* Estimated Returns */}
        {estPayout && (
          <p className="mb-5 text-xs text-gray-500 font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-2xl animate-fadeIn flex items-center justify-between">
            <span>Estimated return if win:</span>
            <span className="font-extrabold text-emerald-600 text-sm">
              ~{estPayout} MON
            </span>
          </p>
        )}

        {/* Submit Button */}
        <button
          onClick={confirm}
          disabled={!valid || isPending || confirming || isSuccess}
          className="w-full rounded-full bg-black hover:bg-neutral-800 py-3.5 text-xs font-bold text-white transition disabled:opacity-40 active:scale-95 shadow-md"
        >
          {isSuccess
            ? "Bet Placed ✓"
            : isPending
              ? "Confirm in Wallet…"
              : confirming
                ? "Waiting for block confirmation…"
                : "Confirm Bet"}
        </button>

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-xl animate-fadeIn">
            {error.message.split("\n")[0]}
          </p>
        )}
        {isSuccess && (
          <p className="mt-3 text-xs text-emerald-600 font-semibold text-center animate-fadeIn">
            Confirmed! Closing shortly…
          </p>
        )}
      </div>
    </div>
  );
}

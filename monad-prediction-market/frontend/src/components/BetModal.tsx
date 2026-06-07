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
  //   (amount + totalPool) / (yourSide + amount) * amount
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-monad-border bg-monad-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold">
            Betting{" "}
            <span className={side ? "text-monad-purple" : "text-monad-coral"}>
              {side ? "YES" : "NO"}
            </span>{" "}
            on:
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-300">{market.question}</p>

        <div className="mb-4 flex justify-between rounded-lg bg-black/30 px-3 py-2 text-sm">
          <span className="text-monad-purple">
            YES {formatMon(market.yesPool)} MON
          </span>
          <span className="text-monad-coral">
            NO {formatMon(market.noPool)} MON
          </span>
        </div>

        <label className="mb-1 block text-sm text-gray-400">Amount (MON)</label>
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
          className="mb-3 w-full rounded-xl border border-monad-border bg-black/40 px-4 py-2 outline-none focus:border-monad-purple"
        />

        {estPayout && (
          <p className="mb-4 text-sm text-gray-300">
            Estimated payout if you win:{" "}
            <span className="font-semibold text-emerald-300">
              ~{estPayout} MON
            </span>
          </p>
        )}

        <button
          onClick={confirm}
          disabled={!valid || isPending || confirming || isSuccess}
          className="w-full rounded-xl bg-monad-purple px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSuccess
            ? "Bet placed ✓"
            : isPending
              ? "Confirm in wallet…"
              : confirming
                ? "Waiting for block…"
                : "Confirm Bet"}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-400">
            {error.message.split("\n")[0]}
          </p>
        )}
        {isSuccess && (
          <p className="mt-3 text-sm text-emerald-300">
            Confirmed! Closing…
          </p>
        )}
      </div>
    </div>
  );
}

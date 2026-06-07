"use client";

import { useMemo, useState } from "react";
import {
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS, MARKET_ABI } from "@/constants/contracts";
import type { Market } from "@/hooks/useMarkets";

interface Props {
  markets: Market[];
}

export function AdminPanel({ markets }: Props) {
  const unresolved = useMemo(
    () => markets.filter((m) => !m.resolved),
    [markets]
  );

  // Selected outcome per market address (default YES = true).
  const [outcomes, setOutcomes] = useState<Record<string, boolean>>({});
  const outcomeFor = (addr: string) => outcomes[addr] ?? true;
  const setOutcome = (addr: string, value: boolean) =>
    setOutcomes((prev) => ({ ...prev, [addr]: value }));

  // Batch resolve.
  const {
    writeContract: writeMany,
    data: manyHash,
    isPending: manyPending,
    error: manyError,
  } = useWriteContract();
  const { isLoading: manyConfirming, isSuccess: manyDone, data: manyReceipt } =
    useWaitForTransactionReceipt({ hash: manyHash });

  // Single resolve.
  const {
    writeContract: writeOne,
    isPending: onePending,
    error: oneError,
  } = useWriteContract();

  function resolveAll() {
    if (unresolved.length === 0) return;
    const addrs = unresolved.map((m) => m.address);
    const outs = unresolved.map((m) => outcomeFor(m.address));
    writeMany({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "resolveMany",
      args: [addrs, outs],
    });
  }

  function resolveOne(market: Market) {
    writeOne({
      address: market.address,
      abi: MARKET_ABI,
      functionName: "resolve",
      args: [outcomeFor(market.address)],
    });
  }

  return (
    <section className="rounded-3xl border border-[#5F45FF]/20 bg-[#5F45FF]/5 p-6 shadow-premium">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Admin — Settle Markets</h2>
          <p className="text-xs text-gray-500 mt-1">
            {unresolved.length} unresolved · Batch Settle settles them all in a single block transaction.
          </p>
        </div>
        <button
          onClick={resolveAll}
          disabled={unresolved.length === 0 || manyPending || manyConfirming}
          className="rounded-full bg-black hover:bg-neutral-800 px-6 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 active:scale-95 shadow-sm"
        >
          {manyPending
            ? "Confirming…"
            : manyConfirming
              ? `Settling ${unresolved.length} markets...`
              : `Settle All (${unresolved.length})`}
        </button>
      </div>

      {manyDone && manyReceipt && (
        <p className="mb-4 rounded-xl bg-emerald-100 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-700 animate-fadeIn">
          Succeeded! Settled in block #{manyReceipt.blockNumber.toString()} in ~500ms.
        </p>
      )}
      {(manyError || oneError) && (
        <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl animate-fadeIn">
          {(manyError ?? oneError)?.message.split("\n")[0]}
        </p>
      )}

      {unresolved.length === 0 ? (
        <p className="text-sm font-semibold text-gray-600 text-center py-4">All markets settled. 🎉</p>
      ) : (
        <ul className="space-y-3">
          {unresolved.map((m) => (
            <li
              key={m.address}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAEFF4] bg-white px-5 py-3.5 shadow-sm hover:border-[#5F45FF]/30 transition"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800">
                {m.question}
              </span>

              {/* YES/NO Pill Selection Toggle */}
              <div className="flex bg-[#F1F5F9] p-1 rounded-full border border-gray-200">
                <button
                  onClick={() => setOutcome(m.address, true)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition ${
                    outcomeFor(m.address)
                      ? "bg-[#5F45FF] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setOutcome(m.address, false)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition ${
                    !outcomeFor(m.address)
                      ? "bg-[#FF5656] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  NO
                </button>
              </div>

              <button
                onClick={() => resolveOne(m)}
                disabled={onePending}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 shadow-sm"
              >
                Settle
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

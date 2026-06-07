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
    <section className="rounded-2xl border border-monad-purple/50 bg-monad-purple/10 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Admin — Resolve Markets</h2>
          <p className="text-sm text-gray-300">
            {unresolved.length} unresolved · resolveMany settles them all in one
            transaction (~one Monad block).
          </p>
        </div>
        <button
          onClick={resolveAll}
          disabled={unresolved.length === 0 || manyPending || manyConfirming}
          className="rounded-xl bg-monad-purple px-5 py-2 font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {manyPending
            ? "Confirm in wallet…"
            : manyConfirming
              ? `Resolving ${unresolved.length} markets in 1 tx…`
              : `Resolve All (${unresolved.length})`}
        </button>
      </div>

      {manyDone && manyReceipt && (
        <p className="mb-4 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300">
          Done! Resolved in block #{manyReceipt.blockNumber.toString()} in
          ~500ms.
        </p>
      )}
      {(manyError || oneError) && (
        <p className="mb-4 text-sm text-red-400">
          {(manyError ?? oneError)?.message.split("\n")[0]}
        </p>
      )}

      {unresolved.length === 0 ? (
        <p className="text-sm text-gray-300">All markets are resolved. 🎉</p>
      ) : (
        <ul className="space-y-2">
          {unresolved.map((m) => (
            <li
              key={m.address}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-monad-border bg-black/30 px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {m.question}
              </span>

              <div className="flex overflow-hidden rounded-lg border border-monad-border">
                <button
                  onClick={() => setOutcome(m.address, true)}
                  className={`px-3 py-1 text-sm font-semibold ${
                    outcomeFor(m.address)
                      ? "bg-monad-purple text-white"
                      : "text-gray-300"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setOutcome(m.address, false)}
                  className={`px-3 py-1 text-sm font-semibold ${
                    !outcomeFor(m.address)
                      ? "bg-monad-coral text-white"
                      : "text-gray-300"
                  }`}
                >
                  NO
                </button>
              </div>

              <button
                onClick={() => resolveOne(m)}
                disabled={onePending}
                className="rounded-lg border border-monad-border px-3 py-1 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
              >
                Resolve
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

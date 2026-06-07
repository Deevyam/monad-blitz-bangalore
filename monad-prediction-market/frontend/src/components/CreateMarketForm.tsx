"use client";

import { useEffect, useState } from "react";
import { decodeEventLog } from "viem";
import {
  useChainId,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS } from "@/constants/contracts";
import { shortAddress } from "@/lib/format";

export function CreateMarketForm() {
  const [question, setQuestion] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [newMarket, setNewMarket] = useState<string | null>(null);

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Once the tx confirms, pull the new market address out of the event log.
  useEffect(() => {
    if (!isSuccess || !hash || !publicClient) return;
    (async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "MarketCreated") {
              setNewMarket(decoded.args.market);
              break;
            }
          } catch {
            // not our event; skip
          }
        }
      } catch {
        // ignore — the market will still appear via polling
      }
      setQuestion("");
      setClosesAt("");
    })();
  }, [isSuccess, hash, publicClient]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNewMarket(null);
    const ts = Math.floor(new Date(closesAt).getTime() / 1000);
    if (!question.trim() || !Number.isFinite(ts)) return;
    writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "createMarket",
      args: [question.trim(), BigInt(ts)],
      chainId,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-monad-border bg-monad-panel p-5"
    >
      <h2 className="mb-4 text-lg font-bold">Create a market</h2>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            reset();
          }}
          placeholder="Will ETH hit $5k?"
          className="rounded-xl border border-monad-border bg-black/40 px-4 py-2 outline-none focus:border-monad-purple"
        />
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="rounded-xl border border-monad-border bg-black/40 px-4 py-2 outline-none focus:border-monad-purple"
        />
        <button
          type="submit"
          disabled={isPending || confirming || !question.trim() || !closesAt}
          className="rounded-xl bg-monad-purple px-5 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {isPending
            ? "Confirm…"
            : confirming
              ? "Creating…"
              : "Create Market"}
        </button>
      </div>

      {isSuccess && (
        <p className="mt-3 text-sm text-emerald-300">
          Market created!{" "}
          {newMarket && (
            <span className="font-mono">{shortAddress(newMarket)}</span>
          )}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error.message.split("\n")[0]}
        </p>
      )}
    </form>
  );
}

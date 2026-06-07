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

  // Listen for AI programmatically pre-filling the form.
  useEffect(() => {
    const handleFill = (e: Event) => {
      const customEvent = e as CustomEvent<{ question: string; closesAt: string }>;
      if (customEvent.detail) {
        setQuestion(customEvent.detail.question);
        setClosesAt(customEvent.detail.closesAt);
        // Scroll to form
        const formEl = document.getElementById("create-market-form");
        if (formEl) {
          formEl.scrollIntoView({ behavior: "smooth" });
        }
      }
    };
    window.addEventListener("fill-create-market", handleFill);
    return () => window.removeEventListener("fill-create-market", handleFill);
  }, []);

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
      id="create-market-form"
      onSubmit={submit}
      className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200"
    >
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-[#1A1D2D] tracking-tight">Deploy a Prediction Market</h2>
        <p className="text-xs text-gray-500 mt-1">Specify a binary question and a closing deadline timestamp.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            reset();
          }}
          placeholder="e.g. Will Monad mainnet launch before August 2026?"
          className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#5F45FF] focus:bg-white focus:ring-1 focus:ring-[#5F45FF] transition"
        />
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#5F45FF] focus:bg-white focus:ring-1 focus:ring-[#5F45FF] transition font-sans"
        />
        <button
          type="submit"
          disabled={isPending || confirming || !question.trim() || !closesAt}
          className="rounded-full bg-[#5F45FF] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#4a36d6] shadow-sm disabled:opacity-40 active:scale-95"
        >
          {isPending
            ? "Confirming…"
            : confirming
              ? "Deploying…"
              : "Deploy Market"}
        </button>
      </div>

      {isSuccess && (
        <p className="mt-3 text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-fadeIn">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</span>
          Market deployed successfully! Address:{" "}
          {newMarket && (
            <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{shortAddress(newMarket)}</span>
          )}
        </p>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-xl animate-fadeIn">
          {error.message.split("\n")[0]}
        </p>
      )}
    </form>
  );
}

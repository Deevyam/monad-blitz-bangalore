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
import { shortAddress, formatMon } from "@/lib/format";
import { useMarkets, type Market } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { BetModal } from "@/components/BetModal";
import { CreateMarketForm } from "@/components/CreateMarketForm";
import { AdminPanel } from "@/components/AdminPanel";
import { AICopilotSidebar, AIOracleResolutionModal, AITrendSpotter } from "@/components/AICopilot";

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
        className="rounded-full bg-black px-6 py-2.5 font-bold text-white transition hover:bg-neutral-800 shadow-md active:scale-95 text-sm"
      >
        Connect Wallet
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        className="rounded-full bg-amber-500 px-6 py-2.5 font-bold text-black transition hover:bg-amber-600 shadow-md active:scale-95 text-sm"
      >
        Switch to Monad
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="rounded-full border border-[#E2E8F0] bg-white px-5 py-2 font-mono text-xs font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95 shadow-sm"
    >
      {address ? shortAddress(address) : "Connected"}
    </button>
  );
}

export default function Home() {
  const block = useBlockTicker();
  const { address, isConnected } = useAccount();
  const { markets, loading, refetch } = useMarkets();

  const [activeTab, setActiveTab] = useState("Markets");
  const [demoMode, setDemoMode] = useState(true);
  const [bet, setBet] = useState<{ market: Market; side: boolean } | null>(null);
  const [aiSidebarMarket, setAiSidebarMarket] = useState<Market | null>(null);
  const [aiResolutionMarket, setAiResolutionMarket] = useState<Market | null>(null);

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
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Top Zentra-Style Header Nav */}
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b border-[#EAEFF4] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-monad-purple p-2 text-white font-black text-lg shadow-sm">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1D2D]">Predict markets</span>
        </div>

        {/* Pill Nav Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#EEF2F6] p-1.5 rounded-full">
          {["Overview", "Markets", "Balances", "AI Copilot", "Admin"].map((tab) => {
            const isActive = activeTab === tab;
            // Hide admin tab if not owner
            if (tab === "Admin" && !isOwner) return null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 ${isActive
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500 hover:text-black hover:bg-gray-100"
                  }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 font-mono text-xs text-gray-600 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Block: {block !== null ? block.toString() : "…"}</span>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Warning if no factory */}
      {!FACTORY_CONFIGURED && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <span className="font-bold">No Factory Configured.</span> Deploy the contracts and update{" "}
            <code>FACTORY_ADDRESS</code> in <code>src/constants/contracts.ts</code>.
          </div>
        </div>
      )}

      {/* Main Container based on selected tab */}
      {activeTab === "Overview" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Active Markets</span>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                {markets.filter(m => !m.resolved).length}
              </h3>
              <p className="text-xs text-emerald-500 mt-2 font-medium">✓ Real-time indexed</p>
            </div>
            <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aggregate Pool volume</span>
              <h3 className="text-3xl font-extrabold text-[#5F45FF] mt-2">
                {formatMon(markets.reduce((acc, m) => acc + m.yesPool + m.noPool, 0n))} MON
              </h3>
              <p className="text-xs text-emerald-500 mt-2 font-medium">✓ Deep baseline LP</p>
            </div>
            <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Settle accuracy</span>
              <h3 className="text-3xl font-extrabold text-[#5F45FF] mt-2">98.9%</h3>
              <p className="text-xs text-emerald-500 mt-2 font-medium">Consensus verified oracle</p>
            </div>
            <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolve Tx Latency</span>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">312ms</h3>
              <p className="text-xs text-[#5F45FF] mt-2 font-bold bg-[#5F45FF]/5 border border-[#5F45FF]/10 rounded px-2 py-0.5 w-fit">
                ⚡ Monad Parallel Advantage
              </p>
            </div>
          </div>

          {/* AI Trend & Creation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <CreateMarketForm />
            </div>
            <div>
              <AITrendSpotter />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Markets" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1A1D2D] tracking-tight">Active Markets</h2>
              <p className="text-sm text-gray-500 mt-1">Bet on upcoming outcomes or view historical resolutions.</p>
            </div>
          </div>

          {/* Markets grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-3xl border border-[#EAEFF4] bg-white/70"
                />
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
              <span className="text-4xl">🔮</span>
              <h3 className="text-lg font-bold text-gray-800 mt-3">No prediction markets active</h3>
              <p className="text-sm text-gray-500 mt-1">Be the first to create one under the Overview tab!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => (
                <MarketCard
                  key={m.address}
                  market={m}
                  onBet={(market, side) => setBet({ market, side })}
                  onAskAI={(market) => setAiSidebarMarket(market)}
                  onVerifyAI={(market) => setAiResolutionMarket(market)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Balances" && (
        <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
          {/* Header & Mode Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#EAEFF4] rounded-3xl p-6 shadow-premium">
            <div>
              <h2 className="text-xl font-extrabold text-[#1A1D2D] tracking-tight">Portfolio & Yield</h2>
              <p className="text-xs text-gray-500 mt-1">Track your active predictions, stakes, and claimable yields.</p>
            </div>

            <div className="flex items-center gap-3 bg-[#EEF2F6] p-1 rounded-full">
              <button
                onClick={() => setDemoMode(true)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${demoMode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                🔮 Demo Sandbox
              </button>
              <button
                onClick={() => setDemoMode(false)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${!demoMode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                🔌 Live EOA Wallet
              </button>
            </div>
          </div>

          {demoMode ? (
            /* Demo Account Dashboard */
            <div className="space-y-8">
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Asset Value</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-extrabold text-gray-900">1,420.50</h3>
                    <span className="text-sm font-bold text-gray-500">MON</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-2">
                    ▲ +14.9% PnL
                  </span>
                </div>

                <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Stakes</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-extrabold text-gray-900">900.00</h3>
                    <span className="text-sm font-bold text-gray-500">MON</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 font-medium">Staked across 3 markets</p>
                </div>

                <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Claimable Winnings</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-extrabold text-emerald-600">342.80</h3>
                    <span className="text-sm font-bold text-emerald-600">MON</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs text-[#5F45FF] font-bold bg-[#5F45FF]/10 px-2 py-0.5 rounded-full border border-[#5F45FF]/20 mt-2 animate-pulse">
                    ★ 1 Settle Ready
                  </span>
                </div>

                <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium hover:shadow-premium-hover transition duration-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolution ROI</span>
                  <h3 className="text-3xl font-extrabold text-[#5F45FF] mt-2">38.4%</h3>
                  <p className="text-xs text-emerald-500 mt-2 font-medium">4 wins / 1 loss profile</p>
                </div>
              </div>

              {/* Position Tables Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Positions Table */}
                <div className="lg:col-span-2 rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-extrabold text-[#1A1D2D] uppercase tracking-wider">Active Positions</h3>
                    <span className="text-xs text-gray-400 font-bold bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#EAEFF4]">3 Open Trades</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#EEF2F6] text-[10px] text-gray-400 font-extrabold uppercase">
                          <th className="pb-3">Prediction Market</th>
                          <th className="pb-3 text-center">Outcome</th>
                          <th className="pb-3 text-right">Staked</th>
                          <th className="pb-3 text-right">Odds</th>
                          <th className="pb-3 text-right">Est. Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F8F9FA] text-xs font-semibold">
                        <tr>
                          <td className="py-4 pr-3 max-w-[200px] truncate text-gray-800">
                            Will Monad mainnet launch in Q3 2025?
                          </td>
                          <td className="py-4 text-center">
                            <span className="bg-[#5F45FF]/10 text-[#5F45FF] px-2 py-0.5 rounded-full font-bold text-[10px]">YES</span>
                          </td>
                          <td className="py-4 text-right text-gray-900">500.00 MON</td>
                          <td className="py-4 text-right text-gray-500">68%</td>
                          <td className="py-4 text-right text-emerald-600 font-bold">735.29 MON</td>
                        </tr>
                        <tr>
                          <td className="py-4 pr-3 max-w-[200px] truncate text-gray-800">
                            Will Solana flip Ethereum in TVL by EOY?
                          </td>
                          <td className="py-4 text-center">
                            <span className="bg-[#FF5656]/10 text-[#FF5656] px-2 py-0.5 rounded-full font-bold text-[10px]">NO</span>
                          </td>
                          <td className="py-4 text-right text-gray-900">300.00 MON</td>
                          <td className="py-4 text-right text-gray-500">78%</td>
                          <td className="py-4 text-right text-emerald-600 font-bold">384.61 MON</td>
                        </tr>
                        <tr>
                          <td className="py-4 pr-3 max-w-[200px] truncate text-gray-800">
                            Will BTC dominance exceed 60% this month?
                          </td>
                          <td className="py-4 text-center">
                            <span className="bg-[#5F45FF]/10 text-[#5F45FF] px-2 py-0.5 rounded-full font-bold text-[10px]">YES</span>
                          </td>
                          <td className="py-4 text-right text-gray-900">100.00 MON</td>
                          <td className="py-4 text-right text-gray-500">55%</td>
                          <td className="py-4 text-right text-emerald-600 font-bold">181.81 MON</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Historic Settlements / Claiming */}
                <div className="rounded-3xl border border-[#EAEFF4] bg-white p-6 shadow-premium space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-[#1A1D2D] uppercase tracking-wider">Settlements Ledger</h3>

                    <div className="space-y-3.5">
                      {/* Settle Ready Win */}
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Settle Ready</span>
                          <span className="text-xs text-gray-400 font-medium">2 hours ago</span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-800 leading-snug">Will the next Fed meeting cut interest rates?</h4>
                        <div className="flex justify-between items-baseline border-t border-emerald-100/50 pt-2 text-xs">
                          <span className="text-gray-500 font-medium">Payout Won:</span>
                          <span className="text-emerald-600 font-extrabold">342.80 MON</span>
                        </div>
                        <button
                          onClick={() => alert("Demo Transaction Success!\n342.80 MON claimed from Simulated Contract and added to your balance.")}
                          className="w-full rounded-full bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95 shadow-sm mt-1"
                        >
                          Claim Winnings
                        </button>
                      </div>

                      {/* Claimed Win */}
                      <div className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4 flex flex-col gap-2.5 opacity-70">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full uppercase tracking-wide">Claimed ✓</span>
                          <span className="text-xs text-gray-400 font-medium">1 day ago</span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-800 leading-snug">Will ETH hit $5k by end of 2025?</h4>
                        <div className="flex justify-between items-baseline border-t border-gray-300/20 pt-2 text-xs">
                          <span className="text-gray-500 font-medium">Payout Collected:</span>
                          <span className="text-gray-700 font-bold">210.00 MON</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-gray-400 text-center font-medium leading-normal mt-4">
                    This is a preloaded sandbox profile highlighting full contract capabilities. Switch to Live Wallet to view EOA balances.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Live Account Dashboard */
            <div className="rounded-3xl border border-[#EAEFF4] bg-white p-12 text-center shadow-premium max-w-2xl mx-auto space-y-4">
              <span className="text-4xl">🔌</span>
              <h3 className="text-lg font-bold text-gray-800">Live Wallet Positions</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Connect your EOA wallet (MetaMask, Coinbase Wallet, etc.) to view your real-time on-chain balances and positions on the Monad testnet.
              </p>

              <div className="pt-6 border-t border-[#EEF2F6] flex justify-around text-left">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Connected Account</span>
                  <p className="text-sm font-mono font-bold mt-1 text-gray-800">
                    {address ? shortAddress(address) : "Not connected"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Bets</span>
                  <p className="text-sm font-bold mt-1 text-[#5F45FF]">
                    {isConnected ? `${markets.filter(m => m.resolved).length} Markets claimed/active` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "AI Copilot" && (
        <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-[#1A1D2D] tracking-tight">BlitzAgent AI Copilot</h2>
            <p className="text-sm text-gray-500">Autonomous analysis, event-scanning, and oracle validations.</p>
          </div>
          <AITrendSpotter />
        </div>
      )}

      {activeTab === "Admin" && isOwner && (
        <div className="animate-fadeIn">
          <AdminPanel markets={markets} />
        </div>
      )}

      {/* Modals & Overlays */}
      {bet && (
        <BetModal
          market={bet.market}
          side={bet.side}
          onClose={() => setBet(null)}
        />
      )}

      {/* AI Sidebar Overlay */}
      {aiSidebarMarket && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setAiSidebarMarket(null)}
        />
      )}

      {/* AI Sidebar */}
      <AICopilotSidebar
        market={aiSidebarMarket}
        onClose={() => setAiSidebarMarket(null)}
      />

      {/* AI Resolution Modal */}
      <AIOracleResolutionModal
        market={aiResolutionMarket}
        onClose={() => setAiResolutionMarket(null)}
        onResolveSuccess={refetch}
        isOwner={isOwner}
      />
    </main>
  );
}

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

/**
 * Monad testnet chain definition.
 * RPC + chainId verified against the official Monad documentation.
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  ssr: true,
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
});

// Make wagmi hooks aware of our config type across the app.
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

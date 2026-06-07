import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";

/**
 * THE DEMO. Resolves every market created by the factory in ONE transaction,
 * which Monad lands in a single ~500ms block. On a sequential chain this would
 * require one block per market.
 *
 * Run with:  npm run demo   (i.e. hardhat run scripts/demo-resolve-many.ts --network monad)
 */
async function main() {
  const factoryAddress = process.env.FACTORY_ADDRESS;
  if (!factoryAddress) {
    throw new Error(
      "FACTORY_ADDRESS is not set. Add it to contracts/.env after deploying."
    );
  }

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  console.log("Factory:", factoryAddress, "\n");

  const factory = await ethers.getContractAt("MarketFactory", factoryAddress);

  // 1. Gather every market.
  const markets: string[] = [...(await factory.getMarkets())];
  if (markets.length === 0) {
    throw new Error("No markets to resolve. Run the deploy script first.");
  }

  // 2. Alternating YES / NO outcomes.
  const outcomes = markets.map((_, i) => i % 2 === 0);

  console.log(`Resolving ${markets.length} markets in a single transaction...`);

  // 3. Time the round trip.
  const start = Date.now();
  const tx = await factory.resolveMany(markets, outcomes);
  const receipt = await tx.wait();
  const elapsed = Date.now() - start;

  console.log(
    `\nResolved ${markets.length} markets in 1 transaction. Time: ${elapsed}ms`
  );
  console.log("Block number:", receipt?.blockNumber);
  console.log("Tx hash:", tx.hash);
  console.log("Explorer:", `${EXPLORER_TX}${tx.hash}`);

  // 4. Confirm on-chain state.
  console.log("\nFinal outcomes:");
  for (let i = 0; i < markets.length; i++) {
    const market = await ethers.getContractAt("PredictionMarket", markets[i]);
    const resolved = await market.resolved();
    const outcome = await market.outcome();
    console.log(
      `  [${i}] ${markets[i]}  resolved=${resolved}  outcome=${outcome ? "YES" : "NO"}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

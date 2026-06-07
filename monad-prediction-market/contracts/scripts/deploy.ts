import { ethers } from "hardhat";

/**
 * Deploys the MarketFactory to Monad testnet and seeds it with 5 markets.
 *
 * Run with:  npm run deploy   (i.e. hardhat run scripts/deploy.ts --network monad)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON\n");

  // ---------------------------------------------------------------------
  // 1. Deploy the factory
  // ---------------------------------------------------------------------
  const Factory = await ethers.getContractFactory("MarketFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("MarketFactory deployed to:", factoryAddress, "\n");

  // ---------------------------------------------------------------------
  // 2. Seed 5 markets, each closing one hour from now
  // ---------------------------------------------------------------------
  const questions = [
    "Will ETH hit $5k by end of 2025?",
    "Will Monad mainnet launch in Q3 2025?",
    "Will BTC dominance exceed 60% this month?",
    "Will the next Fed meeting cut rates?",
    "Will Solana flip Ethereum in TVL by EOY?",
  ];

  const deadline = Math.floor(Date.now() / 1000) + 3600; // now + 1 hour

  console.log("Creating", questions.length, "seed markets...\n");
  for (const question of questions) {
    const tx = await factory.createMarket(question, deadline);
    await tx.wait();
    console.log("  created:", question);
  }

  const markets = await factory.getMarkets();
  console.log("\nDeployed market addresses:");
  markets.forEach((addr: string, i: number) => {
    console.log(`  [${i}] ${addr}  ->  ${questions[i]}`);
  });

  // ---------------------------------------------------------------------
  // 3. Print the factory address for the frontend / demo script
  // ---------------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`FACTORY_ADDRESS=${factoryAddress}`);
  console.log("========================================================");
  console.log("Copy this into frontend/src/constants/contracts.ts");
  console.log("and into contracts/.env (FACTORY_ADDRESS=...) for the demo.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Monad supports opcodes up to the Cancun hard fork (including PUSH0),
      // so the default 0.8.20 target (shanghai) deploys cleanly.
    },
  },
  networks: {
    // Local in-process network used for `npx hardhat test`.
    hardhat: {},
    // Monad testnet.
    monad: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;

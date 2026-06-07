import { parseAbi } from "viem";

/**
 * Address of the deployed MarketFactory.
 *
 * After running `npm run deploy` in ../contracts, paste the printed
 * FACTORY_ADDRESS here (or set NEXT_PUBLIC_FACTORY_ADDRESS in .env.local).
 */
const PLACEHOLDER = "0x0000000000000000000000000000000000000000" as const;

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  PLACEHOLDER) as `0x${string}`;

/** True until a real factory address has been configured. */
export const FACTORY_CONFIGURED = FACTORY_ADDRESS !== PLACEHOLDER;

export const FACTORY_ABI = parseAbi([
  "function createMarket(string question, uint256 deadline) external returns (address)",
  "function resolveMany(address[] marketAddrs, bool[] outcomes) external",
  "function getMarkets() external view returns (address[])",
  "function markets(uint256 index) external view returns (address)",
  "function owner() external view returns (address)",
  "event MarketCreated(address indexed market, string question, uint256 deadline)",
]);

export const MARKET_ABI = parseAbi([
  "function bet(bool side) external payable",
  "function resolve(bool outcome) external",
  "function claim() external",
  "function getMarketInfo() external view returns (string, uint256, uint256, uint256, bool, bool)",
  "function yesPool() external view returns (uint256)",
  "function noPool() external view returns (uint256)",
  "function resolved() external view returns (bool)",
  "function outcome() external view returns (bool)",
  "function question() external view returns (string)",
  "function deadline() external view returns (uint256)",
  "function yesBets(address user) external view returns (uint256)",
  "function noBets(address user) external view returns (uint256)",
  "function claimed(address user) external view returns (bool)",
  "event BetPlaced(address indexed user, bool side, uint256 amount)",
  "event Resolved(bool outcome)",
  "event Claimed(address indexed user, uint256 payout)",
]);

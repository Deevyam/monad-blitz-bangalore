# Monad Prediction Markets

A parallel prediction-market dApp on **Monad testnet** (chainId `10143`).

Anyone can create a YES/NO market, bet native **MON**, and — once resolved —
winners claim a proportional share of the pool. The headline feature is
`resolveMany()`, which settles many markets in **one transaction / one block**
(~500 ms) thanks to Monad's parallel execution. On a sequential chain the same
work would take one block per market.

```
monad-prediction-market/
├── contracts/        Hardhat project (Solidity 0.8.20)
│   ├── contracts/    PredictionMarket.sol, MarketFactory.sol
│   ├── scripts/      deploy.ts, demo-resolve-many.ts
│   └── test/         PredictionMarket.test.ts
└── frontend/         Next.js 14 + wagmi v2 + viem + Tailwind
```

## 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env          # then add your PRIVATE_KEY
npm run compile
npm test                      # all tests should pass
npm run deploy                # deploys factory + 5 seed markets to Monad
```

`npm run deploy` prints `FACTORY_ADDRESS=0x…`. Copy it into:

- `contracts/.env`            → `FACTORY_ADDRESS=0x…` (for the demo script)
- `frontend/src/constants/contracts.ts` → the `PLACEHOLDER` default, **or**
  `frontend/.env.local`       → `NEXT_PUBLIC_FACTORY_ADDRESS=0x…`

The parallel-resolution demo:

```bash
npm run demo                  # resolveMany over every market in one tx
```

## 2. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_FACTORY_ADDRESS=0xYOURFACTORY" > .env.local
npm run dev                   # http://localhost:3000
```

Connect MetaMask to Monad testnet (the app offers a "Switch to Monad" button),
create markets, place bets, then — as the factory owner — open the **Admin**
panel and hit **Resolve All** to watch every market settle in a single block.

### Network details (verified)

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| Network name     | Monad Testnet                      |
| RPC URL          | https://testnet-rpc.monad.xyz      |
| Chain ID         | 10143                              |
| Currency         | MON                                |
| Block explorer   | https://testnet.monadexplorer.com  |
| Faucet           | https://testnet.monad.xyz          |

## Notes

- Markets created through the factory are resolvable both individually (by the
  owner) and in bulk via `MarketFactory.resolveMany`. The factory is recorded
  as an authorized resolver on each market it deploys, which is what makes the
  one-transaction batch resolution possible.
- All payouts use integer math; `claim()` flips the `claimed` flag before
  transferring funds (checks-effects-interactions) to prevent reentrancy.

import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { PredictionMarket, MarketFactory } from "../typechain-types";

const ONE_HOUR = 3600;

describe("PredictionMarket", () => {
  // ---------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------

  async function deployMarketFixture() {
    const [owner, user1, user2, other] = await ethers.getSigners();
    const deadline = (await time.latest()) + ONE_HOUR;

    // Deploy directly from `owner` so that both the owner and the deployer
    // (factory field) resolve to `owner` for the standalone resolve tests.
    const Market = await ethers.getContractFactory("PredictionMarket", owner);
    const market = (await Market.deploy(
      "Will ETH hit $5k by end of 2025?",
      deadline,
      owner.address
    )) as unknown as PredictionMarket;
    await market.waitForDeployment();

    return { market, deadline, owner, user1, user2, other };
  }

  // ---------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------

  describe("Deployment", () => {
    it("sets question, deadline and owner correctly", async () => {
      const { market, deadline, owner } = await loadFixture(deployMarketFixture);
      expect(await market.question()).to.equal("Will ETH hit $5k by end of 2025?");
      expect(await market.deadline()).to.equal(deadline);
      expect(await market.owner()).to.equal(owner.address);
      expect(await market.resolved()).to.equal(false);
      expect(await market.yesPool()).to.equal(0n);
      expect(await market.noPool()).to.equal(0n);
    });

    it("reverts when deadline is not in the future", async () => {
      const [owner] = await ethers.getSigners();
      const Market = await ethers.getContractFactory("PredictionMarket", owner);
      const past = (await time.latest()) - 1;
      await expect(
        Market.deploy("Past market", past, owner.address)
      ).to.be.revertedWith("Deadline must be in future");
    });
  });

  // ---------------------------------------------------------------------
  // Betting
  // ---------------------------------------------------------------------

  describe("Betting", () => {
    it("lets a user bet YES and increases the YES pool", async () => {
      const { market, user1 } = await loadFixture(deployMarketFixture);
      const amount = ethers.parseEther("1");

      await expect(market.connect(user1).bet(true, { value: amount }))
        .to.emit(market, "BetPlaced")
        .withArgs(user1.address, true, amount);

      expect(await market.yesPool()).to.equal(amount);
      expect(await market.noPool()).to.equal(0n);
      expect(await market.yesBets(user1.address)).to.equal(amount);
    });

    it("lets a user bet NO and increases the NO pool", async () => {
      const { market, user2 } = await loadFixture(deployMarketFixture);
      const amount = ethers.parseEther("2");

      await expect(market.connect(user2).bet(false, { value: amount }))
        .to.emit(market, "BetPlaced")
        .withArgs(user2.address, false, amount);

      expect(await market.noPool()).to.equal(amount);
      expect(await market.yesPool()).to.equal(0n);
      expect(await market.noBets(user2.address)).to.equal(amount);
    });

    it("accumulates multiple bets from the same user", async () => {
      const { market, user1 } = await loadFixture(deployMarketFixture);
      await market.connect(user1).bet(true, { value: ethers.parseEther("1") });
      await market.connect(user1).bet(true, { value: ethers.parseEther("0.5") });
      expect(await market.yesBets(user1.address)).to.equal(ethers.parseEther("1.5"));
      expect(await market.yesPool()).to.equal(ethers.parseEther("1.5"));
    });

    it("cannot bet after the deadline", async () => {
      const { market, user1 } = await loadFixture(deployMarketFixture);
      await time.increase(ONE_HOUR + 1);
      await expect(
        market.connect(user1).bet(true, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Market is closed");
    });

    it("cannot bet with zero value", async () => {
      const { market, user1 } = await loadFixture(deployMarketFixture);
      await expect(
        market.connect(user1).bet(true, { value: 0 })
      ).to.be.revertedWith("Bet amount must be > 0");
    });

    it("cannot bet after the market is resolved", async () => {
      const { market, owner, user1 } = await loadFixture(deployMarketFixture);
      await market.connect(owner).resolve(true);
      await expect(
        market.connect(user1).bet(true, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Market already resolved");
    });
  });

  // ---------------------------------------------------------------------
  // Resolving
  // ---------------------------------------------------------------------

  describe("Resolving", () => {
    it("lets the owner resolve YES", async () => {
      const { market, owner } = await loadFixture(deployMarketFixture);
      await expect(market.connect(owner).resolve(true))
        .to.emit(market, "Resolved")
        .withArgs(true);
      expect(await market.resolved()).to.equal(true);
      expect(await market.outcome()).to.equal(true);
    });

    it("lets the owner resolve NO", async () => {
      const { market, owner } = await loadFixture(deployMarketFixture);
      await expect(market.connect(owner).resolve(false))
        .to.emit(market, "Resolved")
        .withArgs(false);
      expect(await market.resolved()).to.equal(true);
      expect(await market.outcome()).to.equal(false);
    });

    it("does not let a non-owner resolve", async () => {
      const { market, other } = await loadFixture(deployMarketFixture);
      await expect(market.connect(other).resolve(true)).to.be.revertedWith(
        "Not authorized"
      );
    });

    it("cannot resolve twice", async () => {
      const { market, owner } = await loadFixture(deployMarketFixture);
      await market.connect(owner).resolve(true);
      await expect(market.connect(owner).resolve(false)).to.be.revertedWith(
        "Market already resolved"
      );
    });
  });

  // ---------------------------------------------------------------------
  // Claiming
  // ---------------------------------------------------------------------

  describe("Claiming", () => {
    async function bettingFixture() {
      const base = await loadFixture(deployMarketFixture);
      // user1 bets 1 MON YES, user2 bets 1 MON NO => total pool = 2 MON.
      await base.market.connect(base.user1).bet(true, { value: ethers.parseEther("1") });
      await base.market.connect(base.user2).bet(false, { value: ethers.parseEther("1") });
      return base;
    }

    it("pays a YES bettor the correct proportional payout when YES wins", async () => {
      const { market, owner, user1 } = await bettingFixture();
      await market.connect(owner).resolve(true);

      // payout = stake * total / winnerPool = 1 * 2 / 1 = 2 MON
      const expectedPayout = ethers.parseEther("2");
      const marketAddr = await market.getAddress();

      const tx = market.connect(user1).claim();
      await expect(tx)
        .to.emit(market, "Claimed")
        .withArgs(user1.address, expectedPayout);
      // The contract pays out its entire balance to the sole winner.
      await expect(tx).to.changeEtherBalance(marketAddr, -expectedPayout);

      expect(await market.claimed(user1.address)).to.equal(true);
      expect(await ethers.provider.getBalance(marketAddr)).to.equal(0n);
    });

    it("splits the pool proportionally among multiple winners", async () => {
      const { market, owner, user1, user2, other } = await loadFixture(deployMarketFixture);
      // YES: user1 = 3, user2 = 1 (winnerPool = 4). NO: other = 4. total = 8.
      await market.connect(user1).bet(true, { value: ethers.parseEther("3") });
      await market.connect(user2).bet(true, { value: ethers.parseEther("1") });
      await market.connect(other).bet(false, { value: ethers.parseEther("4") });
      await market.connect(owner).resolve(true);

      // user1 payout = 3 * 8 / 4 = 6 ; user2 payout = 1 * 8 / 4 = 2
      await expect(market.connect(user1).claim())
        .to.emit(market, "Claimed")
        .withArgs(user1.address, ethers.parseEther("6"));
      await expect(market.connect(user2).claim())
        .to.emit(market, "Claimed")
        .withArgs(user2.address, ethers.parseEther("2"));
    });

    it("gives a NO bettor nothing when YES wins", async () => {
      const { market, owner, user2 } = await bettingFixture();
      await market.connect(owner).resolve(true);
      await expect(market.connect(user2).claim()).to.be.revertedWith(
        "No winning stake"
      );
    });

    it("cannot claim twice", async () => {
      const { market, owner, user1 } = await bettingFixture();
      await market.connect(owner).resolve(true);
      await market.connect(user1).claim();
      await expect(market.connect(user1).claim()).to.be.revertedWith(
        "Already claimed"
      );
    });

    it("cannot claim before the market is resolved", async () => {
      const { market, user1 } = await bettingFixture();
      await expect(market.connect(user1).claim()).to.be.revertedWith(
        "Market not resolved yet"
      );
    });
  });
});

// =======================================================================
// MarketFactory
// =======================================================================

describe("MarketFactory", () => {
  async function deployFactoryFixture() {
    const [owner, alice, bob, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MarketFactory", owner);
    const factory = (await Factory.deploy()) as unknown as MarketFactory;
    await factory.waitForDeployment();
    return { factory, owner, alice, bob, other };
  }

  it("sets the deployer as owner", async () => {
    const { factory, owner } = await loadFixture(deployFactoryFixture);
    expect(await factory.owner()).to.equal(owner.address);
  });

  it("creates a market and tracks it", async () => {
    const { factory } = await loadFixture(deployFactoryFixture);
    const deadline = (await time.latest()) + ONE_HOUR;

    await expect(factory.createMarket("Will it rain tomorrow?", deadline)).to.emit(
      factory,
      "MarketCreated"
    );

    const markets = await factory.getMarkets();
    expect(markets.length).to.equal(1);

    const market = await ethers.getContractAt("PredictionMarket", markets[0]);
    expect(await market.question()).to.equal("Will it rain tomorrow?");
    expect(await market.deadline()).to.equal(deadline);
  });

  it("resolveMany resolves 5 markets in a single call", async () => {
    const { factory, owner } = await loadFixture(deployFactoryFixture);
    const deadline = (await time.latest()) + ONE_HOUR;

    const questions = [
      "Market 0",
      "Market 1",
      "Market 2",
      "Market 3",
      "Market 4",
    ];
    for (const q of questions) {
      await factory.createMarket(q, deadline);
    }

    const addrs = await factory.getMarkets();
    expect(addrs.length).to.equal(5);

    const outcomes = [true, false, true, false, true];

    // The DEMO: one transaction resolves all five markets.
    await factory.connect(owner).resolveMany([...addrs], outcomes);

    for (let i = 0; i < addrs.length; i++) {
      const market = await ethers.getContractAt("PredictionMarket", addrs[i]);
      expect(await market.resolved()).to.equal(true);
      expect(await market.outcome()).to.equal(outcomes[i]);
    }
  });

  it("does not let a non-owner call resolveMany", async () => {
    const { factory, other } = await loadFixture(deployFactoryFixture);
    const deadline = (await time.latest()) + ONE_HOUR;
    await factory.createMarket("Q", deadline);
    const addrs = await factory.getMarkets();
    await expect(
      factory.connect(other).resolveMany([...addrs], [true])
    ).to.be.revertedWith("Only owner can resolve");
  });

  it("reverts resolveMany on length mismatch", async () => {
    const { factory, owner } = await loadFixture(deployFactoryFixture);
    const deadline = (await time.latest()) + ONE_HOUR;
    await factory.createMarket("Q", deadline);
    const addrs = await factory.getMarkets();
    await expect(
      factory.connect(owner).resolveMany([...addrs], [true, false])
    ).to.be.revertedWith("Length mismatch");
  });
});

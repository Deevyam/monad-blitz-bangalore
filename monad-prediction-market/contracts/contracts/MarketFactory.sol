// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {PredictionMarket} from "./PredictionMarket.sol";

/// @title MarketFactory
/// @notice Deploys PredictionMarket instances and provides a batch resolver.
///         resolveMany() resolves many markets in a single transaction — the
///         Monad-native demo: on a sequential chain this would take one block
///         per market, but Monad's parallel execution settles them together in
///         ~one block (~500ms).
contract MarketFactory {
    address[] public markets;
    address public owner;

    event MarketCreated(address indexed market, string question, uint256 deadline);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deploy a new prediction market. The factory owner becomes the
    ///         resolver (owner) of every market it creates, so resolveMany can
    ///         resolve them.
    /// @param question The market question.
    /// @param deadline Unix timestamp after which betting closes.
    /// @return The address of the newly deployed market.
    function createMarket(string calldata question, uint256 deadline)
        external
        returns (address)
    {
        PredictionMarket market = new PredictionMarket(question, deadline, owner);
        address marketAddr = address(market);
        markets.push(marketAddr);

        emit MarketCreated(marketAddr, question, deadline);
        return marketAddr;
    }

    /// @notice Resolve many markets in one transaction. Owner only.
    /// @dev This is the function that showcases Monad's parallel execution:
    ///      all of the per-market resolve() calls land in a single block.
    /// @param marketAddrs Addresses of the markets to resolve.
    /// @param outcomes Outcome for each market (true = YES won).
    function resolveMany(address[] calldata marketAddrs, bool[] calldata outcomes)
        external
    {
        require(msg.sender == owner, "Only owner can resolve");
        require(marketAddrs.length == outcomes.length, "Length mismatch");

        uint256 len = marketAddrs.length;
        for (uint256 i = 0; i < len; i++) {
            PredictionMarket(marketAddrs[i]).resolve(outcomes[i]);
        }
    }

    /// @notice Returns the full list of deployed market addresses.
    function getMarkets() external view returns (address[] memory) {
        return markets;
    }

    /// @notice Convenience helper: number of markets deployed.
    function marketCount() external view returns (uint256) {
        return markets.length;
    }
}

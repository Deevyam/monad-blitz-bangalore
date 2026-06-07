// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title PredictionMarket
/// @notice A single binary (YES/NO) prediction market. Users bet the native
///         token (MON on Monad) on an outcome before a deadline. After the
///         deadline the market is resolved and winners claim a proportional
///         share of the total pool.
contract PredictionMarket {
    // ----------------------------------------------------------------------
    // State
    // ----------------------------------------------------------------------

    /// @notice Account allowed to resolve this market (the creator EOA).
    address public owner;

    /// @notice The contract that deployed this market (the MarketFactory in
    ///         normal usage). Authorized to resolve so the factory can settle
    ///         many markets in one transaction via `resolveMany`.
    address public factory;

    string public question;
    uint256 public deadline;
    uint256 public yesPool;
    uint256 public noPool;
    bool public resolved;
    bool public outcome; // true = YES won, false = NO won

    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;
    mapping(address => bool) public claimed;

    // ----------------------------------------------------------------------
    // Events
    // ----------------------------------------------------------------------

    event BetPlaced(address indexed user, bool side, uint256 amount);
    event Resolved(bool outcome);
    event Claimed(address indexed user, uint256 payout);

    // ----------------------------------------------------------------------
    // Constructor
    // ----------------------------------------------------------------------

    /// @param _question The question being predicted.
    /// @param _deadline Unix timestamp after which betting closes.
    /// @param _owner    Account allowed to resolve the market.
    constructor(string memory _question, uint256 _deadline, address _owner) {
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_owner != address(0), "Owner cannot be zero address");
        question = _question;
        deadline = _deadline;
        owner = _owner;
        // The deployer is recorded as the factory. When this market is created
        // through MarketFactory.createMarket, msg.sender is the factory, which
        // therefore becomes authorized to call resolve() from resolveMany().
        factory = msg.sender;
    }

    // ----------------------------------------------------------------------
    // Betting
    // ----------------------------------------------------------------------

    /// @notice Place a bet on YES (true) or NO (false).
    /// @param side true to bet YES, false to bet NO.
    function bet(bool side) external payable {
        require(msg.value > 0, "Bet amount must be > 0");
        require(block.timestamp < deadline, "Market is closed");
        require(!resolved, "Market already resolved");

        if (side) {
            yesBets[msg.sender] += msg.value;
            yesPool += msg.value;
        } else {
            noBets[msg.sender] += msg.value;
            noPool += msg.value;
        }

        emit BetPlaced(msg.sender, side, msg.value);
    }

    // ----------------------------------------------------------------------
    // Resolution
    // ----------------------------------------------------------------------

    /// @notice Resolve the market with the final outcome.
    /// @dev Callable by the owner or by the deploying factory (enables the
    ///      one-transaction `resolveMany` demo).
    /// @param _outcome true if YES won, false if NO won.
    function resolve(bool _outcome) external {
        require(msg.sender == owner || msg.sender == factory, "Not authorized");
        require(!resolved, "Market already resolved");

        resolved = true;
        outcome = _outcome;

        emit Resolved(_outcome);
    }

    // ----------------------------------------------------------------------
    // Claiming
    // ----------------------------------------------------------------------

    /// @notice Claim a proportional payout from the total pool if you bet on
    ///         the winning side. Uses checks-effects-interactions ordering to
    ///         prevent reentrancy.
    function claim() external {
        require(resolved, "Market not resolved yet");
        require(!claimed[msg.sender], "Already claimed");

        uint256 userStake = outcome ? yesBets[msg.sender] : noBets[msg.sender];
        require(userStake > 0, "No winning stake");

        uint256 winnerPool = outcome ? yesPool : noPool;
        uint256 totalPool = yesPool + noPool;

        // winnerPool is guaranteed > 0 here because userStake > 0 implies the
        // winning pool received at least this user's stake.
        uint256 payout = (userStake * totalPool) / winnerPool;

        // Effects before interaction (reentrancy guard).
        claimed[msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Payout transfer failed");

        emit Claimed(msg.sender, payout);
    }

    // ----------------------------------------------------------------------
    // Views
    // ----------------------------------------------------------------------

    /// @notice Returns the full market state in a single call.
    /// @return _question The market question.
    /// @return _deadline Betting close timestamp.
    /// @return _yesPool Total MON staked on YES.
    /// @return _noPool Total MON staked on NO.
    /// @return _resolved Whether the market has been resolved.
    /// @return _outcome The winning outcome (only meaningful if resolved).
    function getMarketInfo()
        external
        view
        returns (string memory, uint256, uint256, uint256, bool, bool)
    {
        return (question, deadline, yesPool, noPool, resolved, outcome);
    }
}

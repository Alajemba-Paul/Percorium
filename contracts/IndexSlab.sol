// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function decimals() external view returns (uint8);
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

/// @title Percorium IndexSlab
/// @notice Isolated multi-asset vault: official Coinbase B20 inventory + residual USDC.
/// @dev ERC-4626-inspired. asset() is USDC for accounting. One slab cannot contagion another.
contract IndexSlab {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    address public immutable usdc;
    address public immutable factory;
    address public creator;
    uint16 public feeBps;
    uint16 public maxLtvBps;
    uint16 public creatorRoyaltyBps;

    address[] public constituents;
    mapping(address => uint16) public weightBps;
    mapping(address => address) public feeds; // Chainlink total-return feed

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public constant WAD = 1e18;
    uint256 public constant HEARTBEAT = 36 hours;

    error NotFactory();
    error BadWeights();
    error StaleFeed();
    error ZeroAmount();
    error InsufficientShares();

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Minted(address indexed user, uint256 usdcIn, uint256 shares);
    event Redeemed(address indexed user, uint256 shares, bool asUsdc);

    constructor(
        string memory name_,
        string memory symbol_,
        address usdc_,
        address creator_,
        address[] memory constituents_,
        uint16[] memory weightsBps_,
        address[] memory feeds_,
        uint16 feeBps_,
        uint16 maxLtvBps_
    ) {
        if (constituents_.length < 2 || constituents_.length > 10) revert BadWeights();
        if (
            constituents_.length != weightsBps_.length ||
            constituents_.length != feeds_.length
        ) revert BadWeights();
        uint256 sum;
        for (uint256 i; i < constituents_.length; i++) {
            sum += weightsBps_[i];
            constituents.push(constituents_[i]);
            weightBps[constituents_[i]] = weightsBps_[i];
            feeds[constituents_[i]] = feeds_[i];
        }
        if (sum != 10_000) revert BadWeights();
        name = name_;
        symbol = symbol_;
        usdc = usdc_;
        factory = msg.sender;
        creator = creator_;
        feeBps = feeBps_;
        maxLtvBps = maxLtvBps_ == 0 ? 6000 : maxLtvBps_;
        creatorRoyaltyBps = 2000; // 20% of fee
    }

    function constituentCount() external view returns (uint256) {
        return constituents.length;
    }

    /// @notice NAV in USDC 1e6 terms. T0 (supply=0) returns 1e6 (1.00 USDC).
    function nav() public view returns (uint256) {
        uint256 assets = _totalAssetsUsdc();
        if (totalSupply == 0) return 1e6;
        return (assets * 1e18) / totalSupply;
    }

    function _totalAssetsUsdc() internal view returns (uint256 assets) {
        assets = IERC20(usdc).balanceOf(address(this));
        for (uint256 i; i < constituents.length; i++) {
            address tok = constituents[i];
            uint256 qty = IERC20(tok).balanceOf(address(this));
            uint256 px = _priceUsdc(tok); // 1e6 per whole token
            assets += (qty * px) / 1e18;
        }
    }

    function _priceUsdc(address tok) internal view returns (uint256) {
        address feed = feeds[tok];
        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(feed)
            .latestRoundData();
        if (answer <= 0) revert StaleFeed();
        if (block.timestamp - updatedAt > HEARTBEAT) revert StaleFeed();
        // Chainlink 8 decimals → USDC 6 decimals
        return uint256(answer) / 100;
    }

    function mintWithUSDC(uint256 amount) external returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();
        IERC20(usdc).transferFrom(msg.sender, address(this), amount);
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 royalty = (fee * creatorRoyaltyBps) / 10_000;
        if (royalty > 0) IERC20(usdc).transfer(creator, royalty);
        uint256 net = amount - fee;
        uint256 n = nav();
        shares = (net * 1e18) / n;
        _mint(msg.sender, shares);
        emit Minted(msg.sender, amount, shares);
    }

    function redeem(uint256 shares, bool asUsdc) external {
        if (shares == 0 || shares > balanceOf[msg.sender]) revert InsufficientShares();
        uint256 supply = totalSupply;
        _burn(msg.sender, shares);
        if (asUsdc) {
            uint256 usdcBal = IERC20(usdc).balanceOf(address(this));
            uint256 cashOut = (usdcBal * shares) / supply;
            if (cashOut > 0) IERC20(usdc).transfer(msg.sender, cashOut);
            // Remaining basket value is the caller's to route offchain via 0x.
            // Onchain path: pro-rata B20 push.
            for (uint256 i; i < constituents.length; i++) {
                address tok = constituents[i];
                uint256 qty = IERC20(tok).balanceOf(address(this));
                uint256 out = (qty * shares) / supply;
                if (out > 0) IERC20(tok).transfer(msg.sender, out);
            }
        } else {
            uint256 usdcBal = IERC20(usdc).balanceOf(address(this));
            uint256 cashOut = (usdcBal * shares) / supply;
            if (cashOut > 0) IERC20(usdc).transfer(msg.sender, cashOut);
            for (uint256 i; i < constituents.length; i++) {
                address tok = constituents[i];
                uint256 qty = IERC20(tok).balanceOf(address(this));
                uint256 out = (qty * shares) / supply;
                if (out > 0) IERC20(tok).transfer(msg.sender, out);
            }
        }
        emit Redeemed(msg.sender, shares, asUsdc);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

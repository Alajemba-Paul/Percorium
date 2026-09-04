// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IndexSlab} from "./IndexSlab.sol";

/// @title Percorium IndexFactory
/// @notice Creates isolated index slabs. Never calls B20Factory.createB20.
contract IndexFactory {
    address public immutable usdc;
    address public treasury;
    address[] public slabs;
    mapping(address => bool) public isSlab;

    event SlabCreated(
        address indexed slab,
        address indexed creator,
        string symbol,
        address[] constituents,
        uint16[] weightsBps
    );

    constructor(address usdc_, address treasury_) {
        usdc = usdc_;
        treasury = treasury_;
    }

    function createSlab(
        string calldata name_,
        string calldata symbol_,
        address[] calldata constituents,
        uint16[] calldata weightsBps,
        address[] calldata feeds,
        uint16 feeBps,
        uint16 maxLtvBps
    ) external returns (address slab) {
        IndexSlab deployed = new IndexSlab(
            name_,
            symbol_,
            usdc,
            msg.sender,
            constituents,
            weightsBps,
            feeds,
            feeBps,
            maxLtvBps
        );
        slab = address(deployed);
        slabs.push(slab);
        isSlab[slab] = true;
        emit SlabCreated(slab, msg.sender, symbol_, constituents, weightsBps);
    }

    function slabCount() external view returns (uint256) {
        return slabs.length;
    }
}

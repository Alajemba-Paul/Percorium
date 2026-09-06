// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IndexSlab} from "./IndexSlab.sol";

/// @title Percorium IndexFactory
/// @notice Creates isolated index slabs. Never calls B20Factory.createB20.
contract IndexFactory {
    address public constant CB_REGISTRY = 0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD;
    address public constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    address public immutable usdc;
    address public treasury;
    address[] public slabs;
    mapping(address => bool) public isSlab;
    mapping(address => bool) public isAllowedB20;

    error InvalidUsdc();
    error UnauthorizedConstituent(address token);

    event SlabCreated(
        address indexed slab,
        address indexed creator,
        string symbol,
        address[] constituents,
        uint16[] weightsBps
    );

    constructor(address usdc_, address treasury_) {
        if (usdc_ != BASE_USDC) revert InvalidUsdc();
        usdc = usdc_;
        treasury = treasury_;

        // Official Coinbase B20 token registry on Base
        isAllowedB20[0x8a93d247134d91e0DE6C9FE80EFE212f45814515] = true; // AAPLc
        isAllowedB20[0xC28414b4334f59b9F3ec24E24e93Fae7000d07BE] = true; // NVDAc
        isAllowedB20[0x14044F498f3ec18a38Eb108f97E4A56201e74a8d] = true; // TSLAc
        isAllowedB20[0xE228E18ca83eb054F3b934752c008E3b91B5f739] = true; // MSFTc
        isAllowedB20[0x6FE3FdD16b710C35B9156F3F4bB9e4B32c56aA0F] = true; // GOOGLc
        isAllowedB20[0xd010486b7Ce94FE4E6e1e60058b73f1505374e50] = true; // COINc
        isAllowedB20[0x9F4A42f360c40685cA9c6a7E07faEb8a82d02a9A] = true; // CRCLc
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
        for (uint256 i; i < constituents.length; i++) {
            if (!isAllowedB20[constituents[i]]) revert UnauthorizedConstituent(constituents[i]);
        }

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

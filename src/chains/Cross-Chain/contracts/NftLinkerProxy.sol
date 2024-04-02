pragma solidity ^0.8.19;

import {InitProxy} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/InitProxy.sol';

contract NftLinkerProxy is InitProxy {
    function contractId()
        internal
        pure
        override
        returns (bytes32)
    {
        return keccak256('token-linker');
    }
}
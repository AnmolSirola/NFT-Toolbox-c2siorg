pragma solidity ^0.8.19;
// SPDX-License-Identifier: MIT

/*
This Solidity contract TokenBatchMinting demonstrates how to use a Merkle tree 
to verify the validity of token data and achieve efficient batch minting of NFTs.

The contract defines a struct TokenData that represents the data associated with a token, 
including its ID, name, and owner. The contract uses a mapping to store the token data, 
and provides a function addTokenData to add new token data to the mapping.

The contract also defines a function setMerkleRoot to set the Merkle root for the token data,
and a function verifyTokenData to verify the validity of a given token data using a Merkle proof. 
The verifyTokenData function takes in the token ID, name, owner, and a Merkle proof as inputs, 
and returns true if the token data is valid, and false otherwise.

The contract also provides a function verifyMerkleProof to verify a general Merkle proof, 
which takes in the root, leaf, and proof as inputs, and returns true if the proof is valid, and false otherwise.
*/

contract TokenBatchMinting {
    
    struct TokenData {
        uint256 tokenId;
        string tokenName;
        address owner;
    }
    
    // the Merkle root for the token data
    bytes32 public merkleRoot;
    
    // a mapping to store the token data
    mapping (uint256 => TokenData) public tokenData;
    
    // a function to add token data to the mapping
    function addTokenData(uint256 _tokenId, string memory _tokenName, address _owner) public {
        TokenData memory data = TokenData(_tokenId, _tokenName, _owner);
        tokenData[_tokenId] = data;
    }
    
    // a function to set the Merkle root for the token data
    function setMerkleRoot(bytes32 _merkleRoot) public {
        merkleRoot = _merkleRoot;
    }
    
    // a function to verify the validity of token data using a Merkle proof
    function verifyTokenData(uint256 _tokenId, string memory _tokenName, address _owner, bytes32[] memory proof) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_tokenId, _tokenName, _owner));
        return verifyMerkleProof(merkleRoot, leaf, proof);
    }
    
    // a function to verify a Merkle proof
    function verifyMerkleProof(bytes32 root, bytes32 leaf, bytes32[] memory proof) public pure returns (bool) {
        bytes32 currentHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (currentHash < proofElement) {
                currentHash = keccak256(abi.encodePacked(currentHash, proofElement));
            } else {
                currentHash = keccak256(abi.encodePacked(proofElement, currentHash));
            }
        }
        return currentHash == root;
    }
}
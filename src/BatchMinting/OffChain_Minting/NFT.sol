// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TokenBatchMinting is ERC721 {
    uint256 public constant MAX_BATCH_SIZE = 1000;
    uint256 public batchSize = 500;

    struct TokenData {
        uint256 tokenId;
        string tokenName;
        address owner;
    }

    mapping(bytes32 => bool) public merkleRoots;
    mapping(bytes32 => mapping(uint256 => TokenData)) public tokenData;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function setMerkleRoot(bytes32 _merkleRoot) external {
        merkleRoots[_merkleRoot] = true;
    }

    function batchMintNFTs(uint256[] memory _tokenIds, bytes32[][] memory _proofs) external {
        require(_tokenIds.length == _proofs.length, "TokenBatchMinting: Invalid input length");

        bytes32 currentMerkleRoot;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            currentMerkleRoot = merkleRoots[_proofs[i][0]] ? _proofs[i][0] : currentMerkleRoot;
            require(currentMerkleRoot == _proofs[i][0], "TokenBatchMinting: Invalid Merkle proof");
            bytes32 leaf = keccak256(abi.encodePacked(_tokenIds[i], msg.sender));
            require(verifyMerkleProof(currentMerkleRoot, leaf, _proofs[i]), "TokenBatchMinting: Invalid Merkle proof");
            _safeMint(msg.sender, _tokenIds[i]);
        }
    }

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

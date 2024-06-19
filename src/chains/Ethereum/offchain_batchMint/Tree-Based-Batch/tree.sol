// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721URIStorage {
    using Counters for Counters.Counter;

    bytes32 public merkleRoot;
    Counters.Counter private _tokenIdCounter;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function setMerkleRoot(bytes32 _merkleRoot) external {
        merkleRoot = _merkleRoot;
    }

    function batchMintNFTs(address[] memory recipients, string[] memory metadataURIs, bytes32[][] memory _proofs) external {
        require(recipients.length == metadataURIs.length, "MyNFT: Recipients and metadata URIs length mismatch");
        require(recipients.length == _proofs.length, "MyNFT: Recipients and proofs length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(_verifyProof(_proofs[i], recipients[i], metadataURIs[i]), "MyNFT: Invalid Merkle proof");
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);
        }
    }

    function _verifyProof(bytes32[] memory proof, address recipient, string memory metadataURI) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(recipient, metadataURI));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }
}
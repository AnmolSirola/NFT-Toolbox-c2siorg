// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    mapping(uint256 => string) private _tokenIdToURI;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function setTokenURI(uint256 tokenId, string memory uri) external {
        require(_ownerOf(tokenId) != address(0), "MyNFT: Token does not exist");
        _tokenIdToURI[tokenId] = uri;
    }

    function batchMint(address[] memory recipients, uint256[] memory tokenIds, string[] memory uris) external {
        require(recipients.length == tokenIds.length && recipients.length == uris.length, "MyNFT: Input arrays length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "MyNFT: Recipient cannot be zero address");
            
            _safeMint(recipients[i], tokenIds[i]);
            _tokenIdToURI[tokenIds[i]] = uris[i];
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "MyNFT: Token does not exist");
        return _tokenIdToURI[tokenId];
    }
}
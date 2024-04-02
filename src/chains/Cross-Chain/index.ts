'use strict';

import { utils as ethersUtils } from 'ethers';
import { utils as localDevUtils } from '@axelar-network/axelar-local-dev';
import { deployUpgradable } from '@axelar-network/axelar-gmp-sdk-solidity';

import ERC721 from './artifacts/examples/evm/nft-linker/ERC721Demo.sol/ERC721Demo.json';
import NftLinkerProxy from './artifacts/examples/evm/nft-linker/NftLinkerProxy.sol/NftLinkerProxy.json';
import NftLinker from './artifacts/examples/evm/nft-linker/NftLinker.sol/NftLinker.json';

const { keccak256, defaultAbiCoder } = ethersUtils;
const { deployContract } = localDevUtils;

interface Chain {
    name: string;
    erc721: any; 
    contract: any; 
    constAddressDeployer: any; 
    gateway: string; 
    gasService: string; 
}

const tokenId: number = Math.floor(Math.random() * 1000000000);

async function deploy(chain: Chain, wallet: any, key: any) {
    chain.erc721 = await deployContract(wallet, ERC721, ['Test', 'TEST']);
    console.log(`Deployed ERC721Demo for ${chain.name} at ${chain.erc721.address}`);

    chain.contract = await deployUpgradable(
        chain.constAddressDeployer,
        wallet,
        NftLinker,
        NftLinkerProxy,
        [chain.gateway, chain.gasService],
        [],
        defaultAbiCoder.encode(['string'], [chain.name]),
        key,
    );
    console.log(`Deployed NftLinker for ${chain.name} at ${chain.contract.address}`);
}

interface ChainDetails {
    name: string;
    contract: any; 
    erc721: any;
}

async function execute(chains: { source: ChainDetails; destination: ChainDetails; calculateBridgeFee: any }, wallet: any, options: any) {
    const { source, destination, calculateBridgeFee } = options;

    const hash: string = "QmPGrjwCuHKLvbvcSXHLWSgsjfUVx2faV2xsN4b9VB9ogL";
    const metadata: string = `https://ipfs.io/ipfs/${hash}`;

    const getOwnerDetails = async () => {
        const sourceOwner = await source.erc721.ownerOf(tokenId);

        if (sourceOwner !== source.contract.address) {
            return {
                chain: source.name,
                ownerAddress: sourceOwner,
                tokenId: BigInt(tokenId),
            };
        }

        const newTokenId = BigInt(
            keccak256(
                defaultAbiCoder.encode(['string', 'address', 'uint256', 'string'], [source.name, source.erc721.address, tokenId, metadata]),
            ),
        );

        const destOwner = destination.contract.ownerOf(newTokenId);

        if (destOwner) {
            return { chain: destination.name, ownerAddress: destOwner, tokenId: newTokenId };
        }

        const ownerAddress = await source.erc721.ownerOf(tokenId);
        return {
            chain: source.name,
            ownerAddress,
            tokenId: BigInt(tokenId),
        };
    };
    
    async function print(tokenId: number) {
        const owner = await getOwnerDetails();
        console.log(`Token '${tokenId}' was originally minted at ${source.name} is at ${owner.chain}.`);
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    console.log('==== Initially ====');
    await source.erc721.mintWithMetadata(tokenId, hash, metadata);
    console.log(`Minted token ID: '${tokenId}' for ${source.name}`);

    await print(tokenId);

    const fee = await calculateBridgeFee(source, destination);

    const owner = await getOwnerDetails();
    const operatorAddress = source.erc721.address;

    // Approve NFT to the NFTLinker contract
    console.log(`\n==== Approve Original NFT to NFTLinker's contract if needed ====`);
    const srcApproveTx = await source.erc721.approve(source.contract.address, owner.tokenId);
    console.log(`Approved Original NFT (${tokenId}) to NFTLinker's contract`);
    console.log(`Tx Approved Hash: ${srcApproveTx.hash}`);

    // Send NFT to NFTLinker's contract
    console.log("\n==== Send NFT to NFTLinker's contract ====");
    const sendNftTx = await source.contract.sendNFT(operatorAddress, owner.tokenId, destination.name, wallet.address, { value: fee });
    console.log(`Sent NFT ${tokenId} to NFTLinker's contract`, sendNftTx.hash);

    const destinationTokenId = BigInt(
        keccak256(defaultAbiCoder.encode(['string', 'address', 'uint256', 'string'], [source.name, operatorAddress, tokenId, metadata])),
    );
    console.log(`Token ID at ${destination.name} will be: '${destinationTokenId}'`);

    while (true) {
        const originalDetails = await destination.contract.original(destinationTokenId);
        if (originalDetails !== '0x') break;
        await sleep(2000);
    }

    console.log('\n==== Verify Result ====');
    await print(destinationTokenId);

    console.log("\n==== Approve Remote NFT to NFTLinker's contract ====");
    const destApproveTx = await destination.contract.approve(destination.contract.address, destinationTokenId);
    console.log(`Approved Remote NFT (${destinationTokenId}) to NFTLinker's contract`);
    console.log(`Tx Approved Hash: ${destApproveTx.hash}`);

    console.log(`\n==== Send NFT back from '${source.name}' to ${destination.name} ====`);
    const sendBackNftTx = await destination.contract.sendNFT(
        destination.contract.address,
        destinationTokenId,
        source.name,
        wallet.address,
        {
            value: fee,
        },
    );
    console.log(`Sent NFT ${destinationTokenId} back to ${source.name}`, sendBackNftTx.hash);

    while (true) {
        const owner = await source.erc721.ownerOf(tokenId);
        if (owner === wallet.address) break;
        await sleep(2000);
    }

    console.log('\n==== Verify Result ====');
    await print(tokenId);
}

export {
    deploy,
    execute,
};
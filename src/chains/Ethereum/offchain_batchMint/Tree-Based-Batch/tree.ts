import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { NFTStorage, File } from 'nft.storage';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import fs from 'fs';
import path from 'path';
import MyNFT from "./tree.json"; // Assuming this is your contract ABI

// Web3 instance with the Sepolia network provider URL
const web3 = new Web3('https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12');

// Contract instance using the MyNFT ABI and contract address
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[],
  '0xd9145CCE52D386f254917e481eB44e9943F39138'
);

// NFT.storage client
const NFT_STORAGE_KEY = '177458f9.078acba96e7c4f3c9b7bf1a31b759aaf';
const nftStorage = new NFTStorage({ token: NFT_STORAGE_KEY });

// Function to create a Merkle tree and generate proofs
function createMerkleTree(recipients: string[]) {
  const leaves = recipients.map((recipient) =>
    keccak256(web3.utils.soliditySha3(recipient))
  );
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getHexRoot();
  const proofs = recipients.map((recipient) =>
    tree.getHexProof(keccak256(web3.utils.soliditySha3(recipient))).map((p: string) => p.toString())
  );
  return { root, proofs };
}

// Function to upload metadata to IPFS
async function uploadMetadata(name: string, description: string, image: File) {
  const metadata = await nftStorage.store({
    name,
    description,
    image,
  });
  return metadata.url;
}

// Function for off-chain batch minting using Merkle tree
async function offChainMerkleBatchMint(recipients: string[], privateKey: string, metadataDir: string) {
  console.log(`Starting off-chain Merkle batch minting for ${recipients.length} recipients...`);

  try {
    // Creating the Merkle tree and generate proofs
    const { root, proofs } = createMerkleTree(recipients);

    // Setting the Merkle root in the contract
    const setMerkleRootData = myNFTContract.methods.setMerkleRoot(root).encodeABI();
    const setMerkleRootTx = {
      from: web3.eth.accounts.privateKeyToAccount(privateKey).address,
      to: myNFTContract.options.address,
      data: setMerkleRootData,
      gas: 100000,
      gasPrice: await web3.eth.getGasPrice(),
    };
    const signedSetMerkleRootTx = await web3.eth.accounts.signTransaction(setMerkleRootTx, privateKey);
    await web3.eth.sendSignedTransaction(signedSetMerkleRootTx.rawTransaction as string);

    // Upload metadata and mint NFTs
    const metadataUrls = [];
    for (let i = 0; i < recipients.length; i++) {
      const imagePath = path.join(metadataDir, `${i + 1}.png`);
      const imageFile = new File([await fs.promises.readFile(imagePath)], `${i + 1}.png`, { type: 'image/png' });
      const metadataUrl = await uploadMetadata(`NFT #${i + 1}`, `Description for NFT #${i + 1}`, imageFile);
      metadataUrls.push(metadataUrl);
    }

    // Simulating the encoding of ABI data for batchMintNFTs
    const batchMintData = myNFTContract.methods.batchMintNFTs(recipients, proofs).encodeABI();

    // Getting the current nonce for the sender's address
    const nonce = await web3.eth.getTransactionCount(web3.eth.accounts.privateKeyToAccount(privateKey).address);

    // Getting the current gas price
    const gasPrice = await web3.eth.getGasPrice();
    const gasLimit = 3000000; // Increased gas limit for batch minting

    console.log(`Batch Mint Data: ${batchMintData}`);
    console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

    const batchMintTx = {
      from: web3.eth.accounts.privateKeyToAccount(privateKey).address,
      nonce: web3.utils.toHex(nonce),
      gasPrice: web3.utils.toHex(gasPrice),
      gas: web3.utils.toHex(gasLimit),
      to: myNFTContract.options.address,
      data: batchMintData,
    };

    // Signing the transaction with the provided private key
    const signedBatchMintTx = await web3.eth.accounts.signTransaction(batchMintTx, privateKey);

    // Sending the signed transaction and get the transaction receipt
    const receipt = await web3.eth.sendSignedTransaction(signedBatchMintTx.rawTransaction as string);
    console.log(`Merkle batch minting completed successfully. Transaction hash: ${receipt.transactionHash}`);

    // Save metadata URLs to a file
    await fs.promises.writeFile('metadata_urls.json', JSON.stringify(metadataUrls, null, 2));
    console.log('Metadata URLs saved to metadata_urls.json');

  } catch (error) {
    console.error(`Failed to execute Merkle batch minting:`, error);
    throw error;
  }
}

const recipients = [
  '0x087a9d913769E8355f6d25747012995Bc03b80aD',
  '0x8B8f8ffCC5EFbFF06f805D9908A8BC3918a53142',
  '0x187C675C52a3f606a1Aaf35Ae05C652503329Cd2',
];
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';
const metadataDir = './Data/assets'; // Directory containing your image files

offChainMerkleBatchMint(recipients, privateKey, metadataDir);

export { offChainMerkleBatchMint };


/*
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import MyNFT from "./tree.json";
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

// Web3 instance with the Sepolia network provider URL
const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/KyqgnjeQFS4dVlncp3fV3TQLU585Bpuh');

// Contract instance using the MyNFT ABI and contract address
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[],
  '0xd9145CCE52D386f254917e481eB44e9943F39138' // Replace with the actual contract address
);

// Function to create a Merkle tree and generate proofs
function createMerkleTree(recipients: string[]) {
  const leaves = recipients.map((recipient) =>
    keccak256(web3.utils.soliditySha3(recipient))
  );
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getHexRoot();
  const proofs = recipients.map((recipient) =>
    tree.getHexProof(keccak256(web3.utils.soliditySha3(recipient))).map((p: string) => p.toString())
  );
  return { root, proofs };
}

// Function for off-chain batch minting using Merkle tree
async function offChainMerkleBatchMint(recipients: string[], privateKey: string) {
  console.log(`Starting off-chain Merkle batch minting for ${recipients.length} recipients...`);

  try {
    // Creating the Merkle tree and generate proofs
    const { root, proofs } = createMerkleTree(recipients);

    // Setting the Merkle root in the contract
    const setMerkleRootData = myNFTContract.methods.setMerkleRoot(root).encodeABI();
    const setMerkleRootTx = {
      from: '0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0', // Include the from address
      to: '0xd9145CCE52D386f254917e481eB44e9943F39138', // Replace with the actual contract address
      data: setMerkleRootData,
      gas: 100000, // Provide the gas limit
      gasPrice: await web3.eth.getGasPrice(), // Provide the gas price
    };
    const signedSetMerkleRootTx = await web3.eth.accounts.signTransaction(setMerkleRootTx, privateKey);
    await web3.eth.sendSignedTransaction(signedSetMerkleRootTx.rawTransaction as string);

    // Simulating the encoding of ABI data for batchMintNFTs
    const batchMintData = myNFTContract.methods.batchMintNFTs(recipients, proofs).encodeABI();

    // Getting the current nonce for the sender's address
    const nonce = await web3.eth.getTransactionCount('0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0');

    // Getting the current gas price
    const gasPrice = await web3.eth.getGasPrice();
    const gasLimit = 1000000;

    console.log(`Batch Mint Data: ${batchMintData}`);
    console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

    const batchMintTx = {
      from: '0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0', // Include the from address
      nonce: web3.utils.toHex(nonce),
      gasPrice: web3.utils.toHex(gasPrice), // Provide the gas price
      gas: web3.utils.toHex(gasLimit), // Provide the gas limit
      to: '0xd9145CCE52D386f254917e481eB44e9943F39138', // Replace with the actual contract address
      data: batchMintData,
    };

    // Signing the transaction with the provided private key
    const signedBatchMintTx = await web3.eth.accounts.signTransaction(batchMintTx, privateKey);

    // Sending the signed transaction and get the transaction receipt
    const receipt = await web3.eth.sendSignedTransaction(signedBatchMintTx.rawTransaction as string);
    console.log(`Merkle batch minting completed successfully. Transaction hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error(`Failed to execute Merkle batch minting:`, error);
    throw error;
  }
}

const recipients = [
  '0x087a9d913769E8355f6d25747012995Bc03b80aD',
  '0x8B8f8ffCC5EFbFF06f805D9908A8BC3918a53142',
  '0x187C675C52a3f606a1Aaf35Ae05C652503329Cd2',
];
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

offChainMerkleBatchMint(recipients, privateKey);

export { offChainMerkleBatchMint };
*/
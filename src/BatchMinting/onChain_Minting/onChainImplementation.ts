import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import OnChain from './OnChain.json';

// Assuming you have the ABI for the contract
const web3 = new Web3('http://localhost:8545'); // Replace this URL with your Ethereum node URL

const tokenBatchMintingContract = new web3.eth.Contract(
  OnChain.abi as AbiItem[],
  '0xContractAddress' // Replace this with the deployed contract address
);

async function addTokenData(tokenId: number, tokenName: string, owner: string): Promise<void> {
  await tokenBatchMintingContract.methods
    .addTokenData(tokenId, tokenName, owner)
    .send({ from: '<Our Ethereum address>' });
}

async function setMerkleRoot(merkleRoot: string): Promise<void> {
  await tokenBatchMintingContract.methods
    .setMerkleRoot(merkleRoot)
    .send({ from: '<Our Ethereum address>' });
}

async function verifyTokenData(tokenId: number, tokenName: string, owner: string, proof: string[]): Promise<boolean> {
  return await tokenBatchMintingContract.methods
    .verifyTokenData(tokenId, tokenName, owner, proof)
    .call();
}

async function verifyMerkleProof(root: string, leaf: string, proof: string[]): Promise<boolean> {
  return await tokenBatchMintingContract.methods
    .verifyMerkleProof(root, leaf, proof)
    .call();
}

async function main() {
  // Example usage
  const tokenId = 0;
  const tokenName = "OnChain";
  const owner = '0xOwnerAddress'; // Replace with the owner's Ethereum address
  const proof = ['0xProofElement1', '0xProofElement2', '0xProofElement3']; // Example proof array

  // Adding token data
  await addTokenData(tokenId, tokenName, owner);

  // Setting Merkle root
  const merkleRoot = '0xMerkleRootHash'; // Replace with the actual Merkle root
  await setMerkleRoot(merkleRoot);

  // Verifying token data
  const isValid = await verifyTokenData(tokenId, tokenName, owner, proof);
  console.log('Token data validity:', isValid);

  // Verifying Merkle proof
  const root = '0xRootHash'; // Replace with the actual root hash
  const leaf = '0xLeafHash'; // Replace with the actual leaf hash
  const isProofValid = await verifyMerkleProof(root, leaf, proof);
  console.log('Merkle proof validity:', isProofValid);
}

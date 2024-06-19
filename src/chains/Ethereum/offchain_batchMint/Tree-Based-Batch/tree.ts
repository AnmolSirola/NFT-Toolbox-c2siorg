import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import MyNFT from "./tree.json";

// Web3 instance with the Sepolia network provider URL
const web3 = new Web3('https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12');

// Contract instance using the MyNFT ABI and contract address
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[],
  '0xd9145CCE52D386f254917e481eB44e9943F39138' 
);

// Function to create a Merkle tree from token data
function createMerkleTree(tokenData: string[]) {
  const leaves = tokenData.map(data => keccak256(data));
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  return tree;
}

// Function for Merkle Tree-based batch minting
async function merkleBatchMinting(recipients: string[], privateKey: string) {
  const batchSize = 100; 
  const numBatches = Math.ceil(recipients.length / batchSize); // Calculate the number of batches

  for (let i = 0; i < numBatches; i++) {
    const batchRecipients = recipients.slice(i * batchSize, (i + 1) * batchSize);

    const tokenData = batchRecipients.map(recipient => recipient);

    const merkleTree = createMerkleTree(tokenData);
    const rootHash = merkleTree.getHexRoot();

    // Set the Merkle root hash in the smart contract
    await myNFTContract.methods.setMerkleRoot(rootHash).send({ from: '0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0', gas: '100000' });

    // Generate proofs for each recipient in the batch
    const proofs = batchRecipients.map(recipient => {
      const leaf = keccak256(recipient);
      const proof = merkleTree.getHexProof(leaf);
      return proof;
    });

    // Mint tokens for the batch
    await myNFTContract.methods.batchMintNFTs(batchRecipients, proofs).send({ from: '0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0', gas: '5000000' });

    console.log(`Batch ${i + 1} minted successfully.`);
  }

  console.log('Merkle Tree-based batch minting completed.');
}

const recipients = [
  '0x087a9d913769E8355f6d25747012995Bc03b80aD',
  '0x8B8f8ffCC5EFbFF06f805D9908A8BC3918a53142',
  '0x187C675C52a3f606a1Aaf35Ae05C652503329Cd2',
];
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

(async () => {
  try {
    await merkleBatchMinting(recipients, privateKey);
  } catch (error) {
    console.error('An error occurred during the minting process:', error);
  }
})();

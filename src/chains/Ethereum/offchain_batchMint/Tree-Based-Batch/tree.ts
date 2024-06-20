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
    // Create the Merkle tree and generate proofs
    const { root, proofs } = createMerkleTree(recipients);

    // Set the Merkle root in the contract
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

    // Simulate the encoding of ABI data for batchMintNFTs
    const batchMintData = myNFTContract.methods.batchMintNFTs(recipients, proofs).encodeABI();

    // Get the current nonce for the sender's address
    const nonce = await web3.eth.getTransactionCount('0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0');

    // Get the current gas price
    const gasPrice = await web3.eth.getGasPrice();
    const gasLimit = 1000000;

    console.log(`Batch Mint Data: ${batchMintData}`);
    console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

    // Create the transaction object
    const batchMintTx = {
      from: '0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0', // Include the from address
      nonce: web3.utils.toHex(nonce),
      gasPrice: web3.utils.toHex(gasPrice), // Provide the gas price
      gas: web3.utils.toHex(gasLimit), // Provide the gas limit
      to: '0xd9145CCE52D386f254917e481eB44e9943F39138', // Replace with the actual contract address
      data: batchMintData,
    };

    // Sign the transaction with the provided private key
    const signedBatchMintTx = await web3.eth.accounts.signTransaction(batchMintTx, privateKey);

    // Send the signed transaction and get the transaction receipt
    const receipt = await web3.eth.sendSignedTransaction(signedBatchMintTx.rawTransaction as string);
    console.log(`Merkle batch minting completed successfully. Transaction hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error(`Failed to execute Merkle batch minting:`, error);
    throw error;
  }
}

// Example recipients
const recipients = [
  '0x087a9d913769E8355f6d25747012995Bc03b80aD',
  '0x8B8f8ffCC5EFbFF06f805D9908A8BC3918a53142',
  '0x187C675C52a3f606a1Aaf35Ae05C652503329Cd2',
];
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

offChainMerkleBatchMint(recipients, privateKey);

export { offChainMerkleBatchMint };
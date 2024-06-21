import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import MyNFT from "./tree.json";
import BigNumber from 'bignumber.js';

// Web3 instance with the Sepolia network provider URL
const web3 = new Web3('https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12');

// Contract instance using the MyNFT ABI and contract address
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[],
  '0xd9145CCE52D386f254917e481eB44e9943F39138'
);

// Function to upload metadata and image to IPFS
async function uploadToIPFS(tokenId: number, name: string, description: string, imagePath: string) {
  try {
    console.log(`Reading image file: ${imagePath}`);
    const image = await fs.promises.readFile(imagePath);

    console.log(`Uploading metadata for token ${tokenId} to IPFS...`);

    const pinataApiKey = 'cab1fe2327f90513a199';
    const pinataSecretApiKey = '0f477c4131a1ddc2dd3d35c47d33a95cbffbff10fcce0d27945fa2e3802de6a3';

    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath), path.basename(imagePath));

    const pinataMetadata = JSON.stringify({
      name: `${name}.png`,
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey
      }
    });

    console.log(`Metadata uploaded to Pinata. IPFS hash: ${res.data.IpfsHash}`);
    return `ipfs://${res.data.IpfsHash}`;
  } catch (error) {
    console.error(`Failed to upload to IPFS for token ${tokenId}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

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
async function offChainMerkleBatchMint(recipients: string[], privateKey: string, metadataDir: string, batchSize: number) {
  console.log(`Starting off-chain Merkle batch minting for ${recipients.length} recipients...`);

  const numBatches = Math.ceil(recipients.length / batchSize);

  const assetsDir = path.join(metadataDir, 'assets');
  const stateFile = path.join(__dirname, 'minting_state.json');

  console.log(`Assets directory: ${assetsDir}`);
  console.log(`Metadata directory: ${metadataDir}`);

  let lastProcessedIndex = 0;

  // Checking if there's a saved state
  if (fs.existsSync(stateFile)) {
    const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    lastProcessedIndex = savedState.lastProcessedIndex;
    console.log(`Resuming from index ${lastProcessedIndex}`);
  }

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

    // Iterating over each batch
    for (let i = Math.floor(lastProcessedIndex / batchSize); i < numBatches; i++) {
      const start = Math.max(i * batchSize, lastProcessedIndex);
      const end = Math.min((i + 1) * batchSize, recipients.length);
      const batchRecipients = recipients.slice(start, end);
      const batchProofs = proofs.slice(start, end);

      console.log(`Minting batch ${i + 1} of ${numBatches}...`);

      const batchUris: string[] = [];

      // Uploading metadata and images for each token in the batch
      for (let j = 0; j < batchRecipients.length; j++) {
        const tokenId = start + j + 1;
        const imagePath = path.join(assetsDir, `${tokenId}.png`);

        if (!fs.existsSync(imagePath)) {
          console.error(`Image file not found: ${imagePath}`);
          throw new Error(`Image file not found: ${imagePath}`);
        }

        const uri = await uploadToIPFS(
          tokenId,
          `NFT #${tokenId}`,
          `This is NFT number ${tokenId}`,
          imagePath
        );

        batchUris.push(uri);

        // Save metadata locally
        const metadata = {
          name: `NFT #${tokenId}`,
          description: `This is NFT number ${tokenId}`,
          image: uri
        };
        const metadataPath = path.join(metadataDir, `${tokenId}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`Metadata saved locally: ${metadataPath}`);
      }

      // Simulating the encoding of ABI data for batchMintNFTs
      const batchMintData = myNFTContract.methods.batchMintNFTs(batchRecipients, batchProofs).encodeABI();

      // Getting the current nonce for the sender's address
      const nonce = await web3.eth.getTransactionCount(web3.eth.accounts.privateKeyToAccount(privateKey).address);

      // Set a higher gas limit and gas price
      const gasLimit = 5000000;
      const gasPrice = web3.utils.toWei('20', 'gwei');

      console.log(`Batch Mint Data: ${batchMintData}`);
      console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

      // Check if the account has enough balance
      const balance = await web3.eth.getBalance(web3.eth.accounts.privateKeyToAccount(privateKey).address);
      const gasCost = new BigNumber(gasLimit).multipliedBy(new BigNumber(gasPrice));

      if (new BigNumber(balance).isLessThan(gasCost)) {
        console.error(`Insufficient funds. Required: ${web3.utils.fromWei(web3.utils.toBN(gasCost.toString()), 'ether')} ETH, Available: ${web3.utils.fromWei(web3.utils.toBN(balance), 'ether')} ETH`);
        throw new Error('Insufficient funds');
      }

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
      console.log(`Batch ${i + 1} minted successfully. Transaction hash: ${receipt.transactionHash}`);

      // Update the last processed index
      lastProcessedIndex = end;
      fs.writeFileSync(stateFile, JSON.stringify({ lastProcessedIndex }));
    }

    console.log('Off-chain Merkle batch minting completed.');
    // We will only try to delete the state file if it exists
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
      console.log('Minting state file deleted.');
    } else {
      console.log('No minting state file to delete.');
    }
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
const privateKey = '0x0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';
const metadataDir = path.join(__dirname, '..', 'Data');
const batchSize = 100;

offChainMerkleBatchMint(recipients, privateKey, metadataDir, batchSize);

export { offChainMerkleBatchMint };
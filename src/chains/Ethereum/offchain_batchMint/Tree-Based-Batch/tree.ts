import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import MyNFT from "./tree.json";

const web3 = new Web3('https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12');
const myNFTContract = new web3.eth.Contract(MyNFT as AbiItem[], '0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0');

const PINATA_API_KEY = 'cab1fe2327f90513a199';
const PINATA_SECRET_API_KEY = '0f477c4131a1ddc2dd3d35c47d33a95cbffbff10fcce0d27945fa2e3802de6a3';

async function uploadToIPFS(tokenId: number, imagePath: string) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath), path.basename(imagePath));
    formData.append('pinataMetadata', JSON.stringify({ name: `${tokenId}.png` }));
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY
      }
    });

    return `ipfs://${res.data.IpfsHash}`;
  } catch (error) {
    console.error(`Failed to upload to IPFS for token ${tokenId}:`, error);
    return null;
  }
}

function saveState(lastMintedTokenId: number) {
  const stateFile = path.join(__dirname, 'minting_state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ lastMintedTokenId }));
}

async function getOptimizedGasPrice() {
  const gasPrice = await web3.eth.getGasPrice();
  return Math.floor(Number(gasPrice) * 1.1);
}

function createMerkleTree(recipients: string[]) {
  const leaves = recipients.map((recipient) => keccak256(recipient));
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getHexRoot();
  const proofs = recipients.map((recipient) => tree.getHexProof(keccak256(recipient)));
  return { root, proofs };
}

async function signAndSendTransaction(txObject: any, privateKey: string) {
  const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
  return web3.eth.sendSignedTransaction(signedTx.rawTransaction as string);
}

async function offChainMerkleTreeBatchMint(recipients: string[], tokenIds: number[], privateKey: string) {
  console.log(`Starting off-chain Merkle tree batch minting for ${tokenIds.length} NFTs...`);

  const dataDir = path.join(__dirname, '..', 'Data');
  const assetsDir = path.join(dataDir, 'assets');
  const stateFile = path.join(__dirname, 'minting_state.json');

  let lastMintedTokenId = fs.existsSync(stateFile) 
    ? JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastMintedTokenId 
    : 0;

  console.log(`Resuming from token ID ${lastMintedTokenId + 1}`);

  // Ensure the private key is prefixed with '0x'
  const fullPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = web3.eth.accounts.privateKeyToAccount(fullPrivateKey).address;
  const balance = await web3.eth.getBalance(account);
  console.log(`Account balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

  const batchSize = 25;
  const concurrentUploads = 5;
  let totalGasUsed = 0;

  // Create Merkle tree for all recipients
  const { root, proofs } = createMerkleTree(recipients);

  // Set Merkle root in the contract
  const setRootTxObject = {
    from: account,
    to: myNFTContract.options.address,
    data: myNFTContract.methods.setMerkleRoot(root).encodeABI(),
    gas: await web3.eth.estimateGas({
      from: account,
      to: myNFTContract.options.address,
      data: myNFTContract.methods.setMerkleRoot(root).encodeABI()
    }),
    gasPrice: await getOptimizedGasPrice()
  };

  try {
    const setRootTx = await signAndSendTransaction(setRootTxObject, fullPrivateKey);
    console.log(`Merkle root set. Transaction hash: ${setRootTx.transactionHash}`);
  } catch (error) {
    console.error('Failed to set Merkle root:', error);
    return;
  }

  for (let i = lastMintedTokenId; i < tokenIds.length;) {
    const batchEnd = Math.min(i + batchSize, tokenIds.length);
    const batchTokenIds = tokenIds.slice(i, batchEnd);
    const batchRecipients = recipients.slice(i, batchEnd);
    const batchProofs = proofs.slice(i, batchEnd);

    console.log(`Preparing batch for tokens ${i + 1} to ${batchEnd}`);

    // Parallel IPFS uploads
    const uploadPromises = [];
    for (let j = 0; j < batchTokenIds.length; j += concurrentUploads) {
      const uploadBatch = batchTokenIds.slice(j, j + concurrentUploads).map(async (tokenId) => {
        const imagePath = path.join(assetsDir, `${tokenId}.png`);
        if (!fs.existsSync(imagePath)) {
          console.error(`Image file not found: ${imagePath}`);
          return null;
        }
        return uploadToIPFS(tokenId, imagePath);
      });
      uploadPromises.push(...uploadBatch);
    }

    const batchUris = await Promise.all(uploadPromises);
    const validBatch = batchUris.every(uri => uri !== null);

    if (!validBatch) {
      console.error('Failed to upload all tokens in batch. Retrying failed uploads.');
      continue;
    }

    try {
      const gasPrice = await getOptimizedGasPrice();
      const data = myNFTContract.methods.batchMintNFTs(batchRecipients, batchProofs).encodeABI();
      const nonce = await web3.eth.getTransactionCount(account);
      const gasLimit = await myNFTContract.methods.batchMintNFTs(batchRecipients, batchProofs).estimateGas({from: account});

      const txObject = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(Math.floor(Number(gasLimit) * 1.2)),
        to: myNFTContract.options.address,
        data: data,
      };

      const receipt = await signAndSendTransaction(txObject, fullPrivateKey);
      
      const batchGasUsed = Number(receipt.gasUsed);
      totalGasUsed += batchGasUsed;
      
      console.log(`Batch minted. Tokens ${i + 1} to ${batchEnd}`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      console.log(`Gas used for this batch: ${batchGasUsed}`);

      // Update metadata with IPFS URIs
      for (let k = 0; k < batchTokenIds.length; k++) {
        const tokenId = batchTokenIds[k];
        const metadata = {
          name: `NFT #${tokenId}`,
          description: `This is NFT number ${tokenId}`,
          image: batchUris[k]
        };
        fs.writeFileSync(path.join(dataDir, `${tokenId}.json`), JSON.stringify(metadata, null, 2));
      }

      lastMintedTokenId = batchTokenIds[batchTokenIds.length - 1];
      saveState(lastMintedTokenId);
      i = batchEnd;
    } catch (error) {
      console.error(`Failed to mint batch. Last successful mint: Token ${lastMintedTokenId}`);
      console.error('Error:', error);
    }
  }

  console.log('Minting process completed.');
  console.log(`Total gas used for all batches: ${totalGasUsed}`);
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
}

// Example usage
const recipients = Array(100).fill('0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0'); 
const tokenIds = Array.from({ length: 100 }, (_, i) => i + 1);
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

offChainMerkleTreeBatchMint(recipients, tokenIds, privateKey).catch(console.error);
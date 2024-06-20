import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import MyNFT from "./sequential.json";

// Web3 instance with the Sepolia network provider URL
const web3 = new Web3('https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12');

// Contract instance using the MyNFT ABI and contract address
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[],
  '0xd9145CCE52D386f254917e481eB44e9943F39138' // Replace with the actual contract address
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
    return null;
  }
}

// Function for off-chain batch minting
async function offChain(recipients: string[], tokenIds: number[], privateKey: string) {
  const batchSize = 100; // Set the batch size for minting
  const numBatches = Math.ceil(recipients.length / batchSize);
  console.log(`Starting off-chain batch minting for ${recipients.length} recipients...`);

  const dataDir = path.join(__dirname, '..', 'Data');
  const assetsDir = path.join(dataDir, 'assets');
  const metadataDir = path.join(dataDir, 'metadata');
  const stateFile = path.join(__dirname, 'minting_state.json');

  console.log(`Assets directory: ${assetsDir}`);
  console.log(`Metadata directory: ${metadataDir}`);

  let lastProcessedIndex = 0;

  // Check if there's a saved state
  if (fs.existsSync(stateFile)) {
    const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    lastProcessedIndex = savedState.lastProcessedIndex;
    console.log(`Resuming from index ${lastProcessedIndex}`);
  }

  // Iterate over each batch
  for (let i = Math.floor(lastProcessedIndex / batchSize); i < numBatches; i++) {
    const start = Math.max(i * batchSize, lastProcessedIndex);
    const end = Math.min((i + 1) * batchSize, recipients.length);
    const batchRecipients = recipients.slice(start, end);
    const batchTokenIds = tokenIds.slice(start, end);

    console.log(`Minting batch ${i + 1} of ${numBatches}...`);

    const batchUris: string[] = [];

    // Upload metadata and images for each token in the batch
    for (let j = 0; j < batchRecipients.length; j++) {
      const tokenId = batchTokenIds[j];
      const imagePath = path.join(assetsDir, `${tokenId}.png`);
      
      if (!fs.existsSync(imagePath)) {
        console.error(`Image file not found: ${imagePath}`);
        continue;
      }

      const uri = await uploadToIPFS(
        tokenId,
        `NFT #${tokenId}`,
        `This is NFT number ${tokenId}`,
        imagePath
      );

      if (uri) {
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
      } else {
        console.error(`Failed to upload metadata for token ${tokenId}. Skipping this token.`);
      }
    }

    if (batchUris.length === 0) {
      console.error(`No valid URIs in this batch. Skipping minting for batch ${i + 1}.`);
      continue;
    }

    try {
      const data = myNFTContract.methods.batchMint(batchRecipients, batchTokenIds, batchUris).encodeABI();
      const nonce = await web3.eth.getTransactionCount('0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0');
      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = 10000000; // Adjust the gas limit to a lower value

      console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

      const txObject = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit),
        to: '0xd9145CCE52D386f254917e481eB44e9943F39138',
        data: data,
      };

      const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction as string);
      console.log(`Batch ${i + 1} minted successfully. Transaction hash: ${receipt.transactionHash}`);

      // Update the last processed index
      lastProcessedIndex = end;
      fs.writeFileSync(stateFile, JSON.stringify({ lastProcessedIndex }));

    } catch (error) {
      console.error(`Failed to mint batch ${i + 1}:`, error);
      // Save the current state before halting
      fs.writeFileSync(stateFile, JSON.stringify({ lastProcessedIndex }));
      throw error;
    }
  }

  console.log('Off-chain batch minting completed.');
  // Only try to delete the state file if it exists
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    console.log('Minting state file deleted.');
  } else {
    console.log('No minting state file to delete.');
  }
}

// Example recipients and token IDs (replace with your actual data)
const recipients = [
  '0x087a9d913769E8355f6d25747012995Bc03b80aD',
  '0x8B8f8ffCC5EFbFF06f805D9908A8BC3918a53142',
  '0x187C675C52a3f606a1Aaf35Ae05C652503329Cd2',
];
const tokenIds = [1, 2, 3]; // Starting from 1
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

offChain(recipients, tokenIds, privateKey).catch(console.error);

export { offChain };
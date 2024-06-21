
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

    console.log(`Metadata uploaded Token ${tokenId} to Pinata. IPFS hash: ${res.data.IpfsHash}\n`);
    return `ipfs://${res.data.IpfsHash}`;
  } catch (error) {
    console.error(`Failed to upload to IPFS for token ${tokenId}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Function for off-chain sequential batch minting
async function offChainSequential(recipients: string[], tokenIds: number[], privateKey: string) {
  const numNFTs = recipients.length;
  console.log(`Starting off-chain sequential batch minting for ${numNFTs} NFTs...`);

  const dataDir = path.join(__dirname, '..', 'Data');
  const assetsDir = path.join(dataDir, 'assets');
  const metadataDir = path.join(dataDir, 'metadata');
  const stateFile = path.join(__dirname, 'minting_state.json');

  console.log(`Assets directory: ${assetsDir}`);
  console.log(`Metadata directory: ${metadataDir}`);

  let lastMintedTokenId = 0;

  // Check if there's a saved state
  if (fs.existsSync(stateFile)) {
    const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    lastMintedTokenId = savedState.lastMintedTokenId;
    console.log(`Resuming from token ID ${lastMintedTokenId + 1}`);
  }

  // Get the account address from the private key
  const account = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`).address;

  // Check the account balance
  const balance = await web3.eth.getBalance(account);
  console.log(`Account balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

  const batchSize = 50;
  const numBatches = Math.ceil(numNFTs / batchSize);

  // Iterate over each batch
  for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min((batchIndex + 1) * batchSize, numNFTs);
    const currentBatchRecipients = recipients.slice(startIndex, endIndex);
    const currentBatchTokenIds = tokenIds.slice(startIndex, endIndex);

    console.log(`Processing batch ${batchIndex + 1} of ${numBatches}...`);

    // Prepare batch data in parallel
    const batchData = await Promise.all(
      currentBatchTokenIds.map(async (tokenId, index) => {
        const recipient = currentBatchRecipients[index];
        const imagePath = path.join(assetsDir, `${tokenId}.png`);
        const metadataPath = path.join(metadataDir, `${tokenId}.json`);

        // Check if the image file exists
        if (!fs.existsSync(imagePath)) {
          console.error(`Image file not found: ${imagePath}`);
          return null;
        }

        // Check if the metadata file exists
        if (!fs.existsSync(metadataPath)) {
          console.error(`Metadata file not found: ${metadataPath}`);
          return null;
        }

        // Read the metadata file
        const metadataFile = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataFile);

        // Upload the image to IPFS
        const uri = await uploadToIPFS(
          tokenId,
          metadata.name,
          metadata.description,
          imagePath
        );

        if (!uri) {
          console.error(`Failed to upload metadata for token ${tokenId}. Skipping this token.`);
          return null;
        }

        return { recipient, tokenId, uri };
      })
    );

    // Filter out any null entries
    const validBatchData = batchData.filter((data): data is { recipient: string; tokenId: number; uri: string } => data !== null);

    if (validBatchData.length === 0) {
      console.error(`No valid data in batch ${batchIndex + 1}. Skipping this batch.`);
      continue;
    }

    const mintBatchRecipients = validBatchData.map((data) => data.recipient);
    const mintBatchTokenIds = validBatchData.map((data) => data.tokenId);
    const mintBatchUris = validBatchData.map((data) => data.uri);

    try {
      const data = myNFTContract.methods.batchMint(mintBatchRecipients, mintBatchTokenIds, mintBatchUris).encodeABI();
      const nonce = await web3.eth.getTransactionCount(account);
      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = 500000; // Adjust the gas limit based on the actual requirements

      console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

      const txObject = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit),
        to: '0xd9145CCE52D386f254917e481eB44e9943F39138',
        data: data,
      };

      const signedTx = await web3.eth.accounts.signTransaction(txObject, `0x${privateKey}`);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction as string);
      console.log(`Batch ${batchIndex + 1} minted successfully. Transaction hash: ${receipt.transactionHash}`);

      // Update the last minted token ID
      lastMintedTokenId = mintBatchTokenIds[mintBatchTokenIds.length - 1];
      fs.writeFileSync(stateFile, JSON.stringify({ lastMintedTokenId }));

    } catch (error) {
      console.error(`Failed to mint batch ${batchIndex + 1}:`, error);
      // Save the current state before halting
      fs.writeFileSync(stateFile, JSON.stringify({ lastMintedTokenId }));
      throw error;
    }
  }

  console.log('Off-chain sequential batch minting completed.');
  // Only try to delete the state file if it exists
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    console.log('Minting state file deleted.');
  } else {
    console.log('No minting state file to delete.');
  }
}

// Example recipients and token IDs (replace with your actual data)
const recipients = Array(100).fill('0x087a9d913769E8355f6d25747012995Bc03b80aD'); // Example recipient address
const tokenIds = Array.from({ length: 100 }, (_, i) => i + 1); // Token IDs from 1 to 100
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

offChainSequential(recipients, tokenIds, privateKey).catch(console.error);

export { offChainSequential };

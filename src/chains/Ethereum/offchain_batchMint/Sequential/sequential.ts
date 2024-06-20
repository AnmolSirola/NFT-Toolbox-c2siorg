import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import MyNFT from "./sequential.json";
import fs from 'fs';
import path from 'path';

// Web3 instance with the Sepolia network provider URL
const web3 = new Web3('https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12');

// Contract instance using the MyNFT ABI and contract address
const myNFTContract = new web3.eth.Contract(
  MyNFT as AbiItem[],
  '0xd9145CCE52D386f254917e481eB44e9943F39138' // Replace with the actual contract address
);

// Function for off-chain batch minting
async function offChain(recipients: string[], tokenIds: number[], privateKey: string) {
  const batchSize = 100; // Set the batch size for minting
  const numBatches = Math.ceil(recipients.length / batchSize); // Calculate the number of batches
  console.log(`Starting off-chain batch minting for ${recipients.length} recipients...`);

  // Iterate over each batch
  for (let i = 0; i < numBatches; i++) {
    const start = i * batchSize;
    const end = Math.min((i + 1) * batchSize, recipients.length);
    const batchRecipients = recipients.slice(start, end); // Get the recipients for the current batch
    const batchTokenIds = tokenIds.slice(start, end); // Get the token IDs for the current batch

    console.log(`Minting batch ${i + 1} of ${numBatches}...`);
    console.log(`Batch Recipients: ${batchRecipients}`);
    console.log(`Batch Token IDs: ${batchTokenIds}`);

    try {
      // Simulate the encoding of ABI data for batchMint 
      const data = myNFTContract.methods.batchMint(batchRecipients, batchTokenIds, []).encodeABI();
      // Get the current nonce for the sender's address
      const nonce = await web3.eth.getTransactionCount('0xf5C2232A42B89Ff64cCE52BB6f5A0a2beB3F73f0');
      // Get the current gas price
      const gasPrice = await web3.eth.getGasPrice();
      const gasLimit = 1000000; 

      console.log(`Data: ${data}`);
      console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

      // Create the transaction object
      const txObject = {
        nonce: web3.utils.toHex(nonce),
        gasPrice: web3.utils.toHex(gasPrice),
        gasLimit: web3.utils.toHex(gasLimit),
        to: '0xd9145CCE52D386f254917e481eB44e9943F39138', // Replace with the actual contract address
        data: data,
      };

      // Sign the transaction with the provided private key
      const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
      // Send the signed transaction and get the transaction receipt
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction as string);
      console.log(`Batch ${i + 1} minted successfully. Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
      console.error(`Failed to mint batch ${i + 1}:`, error);
      throw error; // Halt the batch minting process
    }
  }

  console.log('Off-chain batch minting completed.');
}

// Example recipients and token IDs (replace with your actual data)
const recipients = [
  '0x087a9d913769E8355f6d25747012995Bc03b80aD',
  '0x8B8f8ffCC5EFbFF06f805D9908A8BC3918a53142',
  '0x187C675C52a3f606a1Aaf35Ae05C652503329Cd2',
];
const tokenIds = [0, 1, 2];
const privateKey = '0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42';

offChain(recipients, tokenIds, privateKey);

export { offChain };

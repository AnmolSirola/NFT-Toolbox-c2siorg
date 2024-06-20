import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, "abi.json"), "utf8"));
const contractAddress = "0xd9145CCE52D386f254917e481eB44e9943F39138";

const providerURL = "https://sepolia.infura.io/v3/b1174536ea344728a2d2eab8aa405f12";
const provider = new ethers.providers.JsonRpcProvider(providerURL);

const privateKey = "0f60d01fe41976c2a847cf929ec2dc1d1b8c40f6a044ae0dab48ddc2e36d6c42";
const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

async function batchMint(startTokenId: number, endTokenId: number, batchSize: number) {
  const totalSupply = await contract.totalSupply();
  if (startTokenId < totalSupply || endTokenId > 10000) {
    throw new Error("Invalid token ID range");
  }

  let currentTokenId = startTokenId;
  while (currentTokenId <= endTokenId) {
    const batch: Promise<ethers.ContractTransaction>[] = [];
    const nonce = await wallet.getTransactionCount();

    for (let i = 0; i < batchSize && currentTokenId <= endTokenId; i++) {
      const tx = await contract.populateTransaction.safeMint(wallet.address, {
        nonce: nonce + i,
      });
      batch.push(wallet.sendTransaction(tx));
      currentTokenId++;
    }

    try {
      await Promise.all(batch);
      console.log(`Minted tokens ${currentTokenId - batchSize} to ${currentTokenId - 1}`);
    } catch (error) {
      console.error("Error minting batch:", error);
      // Save the current state to a JSON file
      const state = {
        startTokenId: currentTokenId - batchSize,
        endTokenId,
        batchSize,
      };
      fs.writeFileSync(path.join(__dirname, "state.json"), JSON.stringify(state));
      throw error;
    }
  }
}

// Usage example: mint tokens 1 to 100 in batches of 5
const startTokenId = 1;
const endTokenId = 100;
const batchSize = 5;

batchMint(startTokenId, endTokenId, batchSize)
  .then(() => {
    console.log("Batch minting completed");
  })
  .catch((error) => {
    console.error("Error in batch minting:", error);
    // Load the state from the JSON file and resume minting
    const stateFile = path.join(__dirname, "state.json");
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      batchMint(state.startTokenId, state.endTokenId, state.batchSize);
    }
  });
import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import { AptosAccount, AptosClient, HexString } from "aptos";

// Create an Aptos account using a private key
const privateKey = new HexString("0x7304Cf13eEE8c8C20C6569E2024fB9079184F430");
const account = new AptosAccount(privateKey.toUint8Array());

// Create an Aptos client connected to the Aptos devnet fullnode
const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

// Initialize the Aptos contract using the nftToolbox
nftToolbox.initAptosContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(fs.readFileSync(path.join(__dirname, "connection.json")).toString()),
  deployed: {
    address: "0x5009278830fB58551bD518157cBb0002eB5DC80E",
    moduleName: "DemoNFT",
  },
});

// Function to demonstrate minting an NFT
const demoMintNFT = async () => {
  // Define the address to mint the NFT to
  const address = "0x7304Cf13eEE8c8C20C6569E2024fB9079184F430";

  // Read the balance of the address before minting
  let bal = await nftToolbox.readAptosContract("balance", [address]);
  console.log("Balance: ", bal.toString());

  console.log("Minting New Token");

  // Mint a new NFT using the nftToolbox
  const tx = await nftToolbox.writeAptosContract("mint", [address]);

  // Wait for the transaction to be confirmed
  await client.waitForTransaction(tx);

  // Read the balance of the address after minting
  bal = await nftToolbox.readAptosContract("balance", [address]);
  console.log("Balance: ", bal.toString());
};

// Call the demoMintNFT function
demoMintNFT();
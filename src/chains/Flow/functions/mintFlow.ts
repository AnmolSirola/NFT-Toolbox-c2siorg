
import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Define the private key
const privateKey = "0x7304Cf13eEE8c8C20C6569E2024fB9079184F430";

// Define the Flow account
const account = fcl.account(privateKey);

// Configure FCL
fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
});

// Initialize Flow contract with existing deployment
nftToolbox.initFlowContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(
    fs.readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
  deployed: {
    address: "0x5009278830fB58551bD518157cBb0002eB5DC80E",
    contractName: "DemoNFT",
  },
});

// Function to mint a new NFT
const demoMintNFT = async () => {
  const address = "0x7304Cf13eEE8c8C20C6569E2024fB9079184F430";
  let bal = await nftToolbox.readFlowContract("getBalance", [address]);
  console.log("Balance: ", bal.toString());

  console.log("Minting New Token");
  const tx = await nftToolbox.writeFlowContract("mintNFT", [address]);
  await tx.confirmation();

  bal = await nftToolbox.readFlowContract("getBalance", [address]);
  console.log("Balance: ", bal.toString());
};

// Execute minting function
demoMintNFT();

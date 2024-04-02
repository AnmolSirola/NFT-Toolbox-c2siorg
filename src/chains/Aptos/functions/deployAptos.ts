import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { AptosAccount, AptosClient, FaucetClient, HexString } from "aptos";

// Create an Aptos account using a private key
const privateKey = new HexString("0x7304Cf13eEE8c8C20C6569E2024fB9079184F430");
const account = new AptosAccount(privateKey.toUint8Array());

// Create an Aptos client connected to the Aptos devnet fullnode
const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

// Create a faucet client for the Aptos devnet
const faucetClient = new FaucetClient("https://faucet.devnet.aptoslabs.com", client);

// Initialize the Aptos contract using the nftToolbox
nftToolbox.initAptosContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(readFileSync(path.join(__dirname, "connection.json")).toString()),
});

// Draft the Aptos contract using the nftToolbox
nftToolbox.draftAptosContract({
  account: account,
  baseUri: "ipfs://exampleCID/",
  mintable: true,
  incremental: true,
});

// Deploy the Aptos contract using the nftToolbox
nftToolbox.deployAptosContract();
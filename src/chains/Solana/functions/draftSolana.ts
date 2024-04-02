
import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import { Keypair } from "@solana/web3.js";

// Create a Keypair object from a secret key
const payer = Keypair.fromSecretKey(Buffer.from("0x087a9d913769E8355f6d25747012995Bc03b80aD", "hex"));

// Create a Buffer object from the program data
const programData = Buffer.from("5zyx93d8GMmKrdKLqMykyQAm5EMMy2vC4GZbGnwQkcMX", "hex");

// Initialize the Solana contract using the nftToolbox
nftToolbox.initSolanaContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(fs.readFileSync(path.join(__dirname, "connection.json")).toString()),
});

// Draft the Solana contract using the nftToolbox
nftToolbox.draftSolanaContract({
  payer: payer,
  programData: programData,
});
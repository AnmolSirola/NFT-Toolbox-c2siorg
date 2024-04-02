
import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { PublicKey, Keypair } from "@solana/web3.js";

// Create a Keypair object from a secret key
const payer = Keypair.fromSecretKey(Buffer.from("0x7304Cf13eEE8c8C20C6569E2024fB9079184F430", "hex"));

// Create a Buffer object from the program data
const programData = Buffer.from("GaTJYGhopJDKYgWtjoaz2Gyc2sfRmW9v5haqppdtVxx5", "hex");

// Initialize the Solana contract using the nftToolbox
nftToolbox.initSolanaContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(
    readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
});

// Draft the Solana contract using the nftToolbox
nftToolbox.draftSolanaContract({
  payer: payer,
  programId: "GaTJYGhopJDKYgWtjoaz2Gyc2sfRmW9v5haqppdtVxx5",
  programData: programData,
});

// Deploy the Solana contract using the nftToolbox
nftToolbox.deploySolanaContract();
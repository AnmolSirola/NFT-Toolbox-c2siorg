
import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import { Keypair } from "@solana/web3.js";

// Create a Keypair object from a secret key
const payer = Keypair.fromSecretKey(Buffer.from("0x087a9d913769E8355f6d25747012995Bc03b80aD", "hex"));

// Create a PublicKey object for the program ID
const programId = new PublicKey("5zyx93d8GMmKrdKLqMykyQAm5EMMy2vC4GZbGnwQkcMX");

// Initialize the Solana contract using the nftToolbox
nftToolbox.initSolanaContract({
name: "DemoContract",
symbol: "DEMO",
dir: path.join(__dirname, "Contracts"),
connection: JSON.parse(fs.readFileSync(path.join(__dirname, "connection.json")).toString()),
deployed: {
programId: programId,
},
});

// Define an async function to demonstrate minting an NFT
const demoMintNFT = async () => {
// Define the address to mint the NFT to
const address = "7abc42e5HKiTeaLvNykxZyePXEMy2vC5HXaLeuPkdTA";

// Read the current balance of the address using the readSolanaContract method
let bal = await nftToolbox.readSolanaContract("balanceOf", [address]);
console.log("Balance: ", bal.toString());

console.log("Minting New Token");

// Mint a new token to the address using the writeSolanaContract method
const tx = await nftToolbox.writeSolanaContract("safeMint", [address]);

// Wait for the transaction to be confirmed
await tx.confirmation("confirmed");

// Read the updated balance of the address
bal = await nftToolbox.readSolanaContract("balanceOf", [address]);
console.log("Balance: ", bal.toString());
};

// Call the demoMintNFT function
demoMintNFT();
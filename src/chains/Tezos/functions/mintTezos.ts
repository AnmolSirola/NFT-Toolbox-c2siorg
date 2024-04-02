import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";
import { InMemorySigner } from "@taquito/signer";

// Define the private key for the signer
const privateKey = "edskRuycScUrc5KqgiWZXWFa4STEAxJSs18ZXLDdfbDGkiwPWne1QjD4TwRzfDqYXgMwVN2dkDYHBVhPZZDxGDNDneAVNErRvv";

// Create an InMemorySigner instance with the private key
const signer = new InMemorySigner(privateKey);

// Initialize the Tezos contract with the specified options
nftToolbox.initTezosContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  standard: "FA2",
  connection: JSON.parse(
    fs.readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
  deployed: {
    address: "KT1BvYJM1v3kD2MTAWWkEjPwrZ2xRP8ztPNS",
    storage: {
      owner: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
      ledger: {},
      operators: [],
      metadata: {
        "": Buffer.from("tezos-storage:demo").toString("hex"),
      },
    },
  },
});

// Define an async function to mint a demo NFT
const demoMintNFT = async () => {
  // Define the address to mint the NFT to
  const address = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";

  // Read the balance of the specified address and token ID
  let bal = await nftToolbox.readTezosContract("balance_of", [
    { owner: address, token_id: 0 },
  ]);
  console.log("Balance: ", bal.toString());

  console.log("Minting New Token");

  // Mint a new token with the specified parameters
  const tx = await nftToolbox.writeTezosContract("mint", [
    {
      address: address,
      amount: 1,
      token_id: 0,
      token_info: {
        symbol: "DEMO",
        name: "Demo NFT",
        decimals: 0,
        extras: {},
      },
    },
  ]);

  // Wait for the transaction to be confirmed
  await tx.confirmation();

  // Read the updated balance after minting
  bal = await nftToolbox.readTezosContract("balance_of", [
    { owner: address, token_id: 0 },
  ]);
  console.log("Balance: ", bal.toString());
};

// Call the demoMintNFT function
demoMintNFT();
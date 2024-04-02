/ Import necessary modules
import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { PublicKey } from "@solana/web3.js";

// Read account details from a JSON file (unused variable)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const account = JSON.parse(
readFileSync(path.join(__dirname, "account.json")).toString()
);

// Initialize the Solana collection using the nftToolbox
nftToolbox.initSolanaCollection({
name: "Demo Collection - Solana",
dir: path.join(__dirname, "Demo Collection - Solana"),
description: "This is a demo collection for NFT Toolbox",
programId: new PublicKey('5zyx93d8GMmKrdKLqMykyQAm5EMMy2vC4GZbGnwQkcMX'),
account: new PublicKey('5zyx93d8GMmKrdKLqMykyQAm5EMMy2vC4GZbGnwQkcMX5'),
});

// Define an async function to upload the Solana collection NFT
const uploadCollectionExample = async function () {
const res = await nftToolbox.uploadSolanaCollectionNFT();
console.log(res);
};

// Define the path to the demo single NFT image
const demoSingleNftImage = path.resolve(
__dirname,
"layers",
"background",
"white.png"
);

// Define the metadata for the demo single NFT
const demoSingleNftMetadata = {
name: "Demo Single NFT",
description: "This is a single demo NFT",
image: "",
attributes: [
{ trait_type: "color", value: "grey" },
{ trait_type: "rarity", value: "1" },
],
};

// Define an async function to upload a single NFT
const uploadSingleExample = async function () {
const res = await nftToolbox.uploadSingleNFT(
demoSingleNftImage,
demoSingleNftMetadata
);
console.log(res);
};

// Initialize the file storage service with Pinata
nftToolbox.initFileStorageService({
service: "pinata",
key: account.PINATA_KEY,
secret: account.PINATA_SECURITY,
});

// Initialize the file storage service with nft.storage
nftToolbox.initFileStorageService({
service: "nft.storage",
key: "59a873d19e03c1h50i73",
});

// Code for initializing file storage service with Storj
// nftToolbox.initFileStorageService({
//   service: "storj",
//   username: account.STORJ_USERNAME,
//   password: account.STORJ_PASSWORD,
// });

// Code for initializing file storage service with Arweave
// nftToolbox.initFileStorageService({
//   service: "arweave",
//   currency: account.ARWEAVE_CURRENCY,
//   wallet: account.ARWEAVE_WALLET,
// });

// Code for initializing file storage service with Infura
// nftToolbox.initFileStorageService({
//   service: "infura",
//   key: account.INFURA_KEY,
//   secret: account.INFURA_SECRET,
// });
// });

// Call the uploadCollectionExample function
uploadCollectionExample();

// uploadSingleExample();
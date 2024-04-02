
import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { InMemorySigner } from "@taquito/signer";

// Read the account information from a JSON file (commented out)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const account = JSON.parse(
  readFileSync(path.join(__dirname, "account.json")).toString()
);

// Define the private key for the signer
const privateKey = "edskRuycScUrc5KqgiWZXWFa4STEAxJSs18ZXLDdfbDGkiwPWne1QjD4TwRzfDqYXgMwVN2dkDYHBVhPZZDxGDNDneAVNErRvv";

// Create an InMemorySigner instance with the private key
const signer = new InMemorySigner(privateKey);

// Initialize the Tezos collection with the specified options
nftToolbox.initTezosCollection({
  name: "Demo Collection - Tezos",
  dir: path.join(__dirname, "Demo Collection - Tezos"),
  description: "This is a demo collection for NFT Toolbox",
  standard: "FA2",
  signer,
});

// Define an async function to upload the collection NFT
const uploadCollectionExample = async function () {
  const res = await nftToolbox.uploadTezosCollectionNFT();
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

// Select one file storage platform (uncomment the desired platform)
nftToolbox.initFileStorageService({
  service: "pinata",
  key: account.PINATA_KEY,
  secret: account.PINATA_SECURITY,
});

// Alternative file storage platforms (commented out)
// nftToolbox.initFileStorageService({
//   service: "nft.storage",
//   key: account.NFT_STORAGE_KEY,
// });

// nftToolbox.initFileStorageService({
//   service: "storj",
//   username: account.STORJ_USERNAME,
//   password: account.STORJ_PASSWORD,
// });

// nftToolbox.initFileStorageService({
//   service: "arweave",
//   currency: account.ARWEAVE_CURRENCY,
//   wallet: account.ARWEAVE_WALLET,
// });

// nftToolbox.initFileStorageService({
//   service: "infura",
//   key: account.INFURA_KEY,
//   secret: account.INFURA_SECRET,
// });

// Call the example functions to upload the collection and single NFT
uploadCollectionExample();
uploadSingleExample();
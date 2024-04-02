import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { AptosAccount, HexString } from "aptos";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const account = JSON.parse(
  readFileSync(path.join(__dirname, "account.json")).toString()
);

const privateKey = new HexString("0x7304Cf13eEE8c8C20C6569E2024fB9079184F430");
const aptosAccount = new AptosAccount(privateKey.toUint8Array());

// Initialize an Aptos NFT collection using the nftToolbox
nftToolbox.initAptosCollection({
  name: "Demo Collection - Aptos",
  dir: path.join(__dirname, "Demo Collection - Aptos"),
  description: "This is a demo collection for NFT Toolbox",
  account: aptosAccount,
});

// Function to upload an Aptos NFT collection
const uploadCollectionExample = async function () {
  const res = await nftToolbox.uploadAptosCollectionNFT();
  console.log(res);
};

// Define the path to a single demo NFT image
const demoSingleNftImage = path.resolve(
  __dirname,
  "layers",
  "background",
  "white.png"
);

// Define the metadata for a single demo NFT
const demoSingleNftMetadata = {
  name: "Demo Single NFT",
  description: "This is a single demo NFT",
  image: "",
  attributes: [
    { trait_type: "color", value: "grey" },
    { trait_type: "rarity", value: "1" },
  ],
};

// Function to upload a single NFT
const uploadSingleExample = async function () {
  const res = await nftToolbox.uploadSingleNFT(
    demoSingleNftImage,
    demoSingleNftMetadata
  );
  console.log(res);
};

//////////////////////// Select ONE File Storage Platform ////////////////////////
nftToolbox.initFileStorageService({
  service: "pinata",
  key: account.PINATA_KEY,
  secret: account.PINATA_SECURITY,
});

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
//////////////////////////////////////////////////////////////////////////////////

uploadCollectionExample();
uploadSingleExample();
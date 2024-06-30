import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { PublicKey } from "@solana/web3.js";

const account = JSON.parse(
  readFileSync(path.join(__dirname, "account.json")).toString()
);

// Assuming account.json contains PROGRAM_ID and ACCOUNT_PUBLIC_KEY
// If not, replace these with appropriate PublicKey values
const programId = new PublicKey(account.PROGRAM_ID || "11111111111111111111111111111111");
const accountPublicKey = new PublicKey(account.ACCOUNT_PUBLIC_KEY || "22222222222222222222222222222222");

nftToolbox.initSolanaCollection({
  name: "Demo Collection - Solana",
  dir: path.join(__dirname, "Demo Collection - Solana"),
  description: "This is a demo collection for NFT Toolbox",
  programId: programId,
  account: accountPublicKey,
});

const uploadCollectionExample = async function () {
  const res = await nftToolbox.uploadSolanaCollectionNFT();
  console.log(res);
};

const demoSingleNftImage = path.resolve(
  __dirname,
  "layers",
  "background",
  "white.png"
);
const demoSingleNftMetadata = {
  name: "Demo Single NFT",
  description: "This is a single demo NFT",
  image: "",
  attributes: [
    { trait_type: "color", value: "grey" },
    { trait_type: "rarity", value: "1" },
  ],
};

const uploadSingleExample = async function () {
  const res = await nftToolbox.uploadSingleNFT(
    demoSingleNftImage,
    demoSingleNftMetadata
  );
  console.log(res);
};

nftToolbox.initFileStorageService({
  service: "pinata",
  key: account.PINATA_KEY,
  secret: account.PINATA_SECURITY,
});

uploadCollectionExample();


uploadSingleExample();
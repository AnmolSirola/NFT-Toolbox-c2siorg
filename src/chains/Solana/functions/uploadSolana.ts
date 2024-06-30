import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";

const account = JSON.parse(
  readFileSync(path.join(__dirname, "account.json")).toString()
);

nftToolbox.initSolanaCollection({
  name: "Demo Collection - Solana",
  dir: path.join(__dirname, "Demo Collection - Solana"),
  description: "This is a demo collection for NFT Toolbox",
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
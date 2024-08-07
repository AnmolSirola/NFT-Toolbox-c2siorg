import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const account = JSON.parse(
	readFileSync(path.join(__dirname, "..", "..", "..","account.json")).toString()
);

nftToolbox.initEthereumCollection({
	name: "Demo Collection",
	dir: path.join(__dirname, "Demo Collection"),
	description: "This is a demo collection for NFT Toolbox",
});

const uploadCollectionExample = async function () {
	const res = await nftToolbox.uploadCollectionNFT();
	console.log(res);
};

const demoSingleNftImage = path.resolve(
	__dirname,
    "..",
    "..",
    "..",
	"layers",
	"background",
	"white#5.png"
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

//////////////////////// Select ONE File Storage Platform ////////////////////////

nftToolbox.initFileStorageService({
	service: "pinata",
	key: "d73c7f3c2620581dc7e1",
	secret: "6c11fbb74a22fd6ff235fbfa8641dde8c3eb4efffa73d30ca7cdf71e649dd0d6",
});


// nftToolbox.initFileStorageService({
// 	service: "nft.storage",
// 	key: account.NFT_STORAGE_KEY,
// });

// nftToolbox.initFileStorageService({
// 	service: "storj",
// 	username: account.STORJ_USERNAME,
// 	password: account.STORJ_PASSWORD,
// });

// nftToolbox.initFileStorageService({
// 	service: "arweave",
// 	currency: account.ARWEAVE_CURRENCY,
// 	wallet: account.ARWEAVE_WALLET,
// });

// nftToolbox.initFileStorageService({
// 	service: "infura",
// 	username: account.INFURA_USERNAME,
// 	password: account.INFURA_PASSWORD,
// });

//////////////////////////////////////////////////////////////////////////////////

// uploadCollectionExample();

uploadSingleExample();

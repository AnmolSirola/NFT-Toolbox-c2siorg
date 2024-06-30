import path from "path";
import fs from "fs";
import { nftToolbox } from "../../../index";

nftToolbox.initSolanaContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(
    fs.readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
  deployed: {
    address: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
    programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
    programData: Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex"),
  },
});

const demoMintNFT = async () => {
  console.log("Minting new NFT...");
  try {
    const signature = await nftToolbox.writeSolanaContract("mintNFT", []);
    console.log(`NFT minted successfully with transaction signature: ${signature}`);
  } catch (error) {
    console.error("Error minting NFT:", error);
  }
};

demoMintNFT();
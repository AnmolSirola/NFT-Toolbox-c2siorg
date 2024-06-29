import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { Keypair } from "@solana/web3.js";

const payer = Keypair.fromSecretKey(Buffer.from("0x7304Cf13eEE8c8C20C6569E2024fB9079184F430", "hex"));
const programData = Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex");

nftToolbox.initSolanaContract({
	name: "DemoContract",
	symbol: "DEMO",
	dir: path.join(__dirname, "Contracts"),
	connection: JSON.parse(
		readFileSync(path.join(__dirname, "connection.json")).toString()
	),
});

nftToolbox.deploySolanaContract({
	payer: payer,
    programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
    programData: programData,
});

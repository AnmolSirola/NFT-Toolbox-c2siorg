
import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import * as fcl from "@onflow/fcl";
import * as types from "@onflow/types";

// Define the private key
const privateKey = "0x7304Cf13eEE8c8C20C6569E2024fB9079184F430";

// Define the Flow account
const account = fcl.account(privateKey);

// Configure FCL
fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
});

// Initialize Flow contract
nftToolbox.initFlowContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  connection: JSON.parse(
    readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
});

// Draft Flow contract
nftToolbox.draftFlowContract({
  account: account,
  baseUri: "ipfs://exampleCID/",
  mintable: true,
  incremental: true,
});
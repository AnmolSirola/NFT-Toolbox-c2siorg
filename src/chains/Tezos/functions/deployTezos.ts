import { readFileSync } from "fs";
import path from "path";
import { nftToolbox } from "../../../index";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";

// Define the secret key
const secretKey = "edskRuycScUrc5KqgiWZXWFa4STEAxJSs18ZXLDdfbDGkiwPWne1QjD4TwRzfDqYXgMwVN2dkDYHBVhPZZDxGDNDneAVNErRvv";

// Create an InMemorySigner instance with the secret key
const signer = new InMemorySigner(secretKey);

// Initialize the Tezos contract
nftToolbox.initTezosContract({
  name: "DemoContract",
  symbol: "DEMO",
  dir: path.join(__dirname, "Contracts"),
  standard: "FA2",
  connection: JSON.parse(
    readFileSync(path.join(__dirname, "connection.json")).toString()
  ),
});

// Draft the Tezos contract
nftToolbox.draftTezosContract({
  storage: {
    owner: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
    ledger: {},
    operators: [],
    metadata: {
      "": Buffer.from("tezos-storage:demo").toString("hex"),
    },
  },
});

// Deploy the Tezos contract
nftToolbox.deployTezosContract();
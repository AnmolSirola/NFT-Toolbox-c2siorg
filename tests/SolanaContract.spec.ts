import { describe } from "mocha";
import chai from "chai";
import fs from "fs";
import path from "path";
import { Contract } from "../src/chains/Solana/contracts/SolanaContract";
import os from "os";
import { Keypair } from "@solana/web3.js";

const expect = chai.expect;

const TEST_CONT_NAME = "Solana DemoNFT";
const TEST_CONT_PATH = path.join(os.tmpdir(), "Contracts");

const test_specs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "test_specs.json")).toString()
);

const testCont = new Contract({
  name: TEST_CONT_NAME,
  symbol: TEST_CONT_NAME,
  dir: TEST_CONT_PATH,
  connection: test_specs.solanaConnection,
  deployed: {
    address: test_specs.solanaConnection.address,
    programId: test_specs.solanaConnection.programId,
    programData: Buffer.from(test_specs.solanaConnection.programData, "hex"),
  },
});

describe("Test suite for SolanaContract Class", () => {
  afterEach(() => {
    // Remove the TEST_CONT_PATH directory and its contents
    if (fs.existsSync(TEST_CONT_PATH)) {
      fs.rmdirSync(TEST_CONT_PATH, { recursive: true });
    }
  });

  it("Checking Draft Solana Method", () => {
    console.log(`TEST_CONT_PATH: ${TEST_CONT_PATH}`);
    console.log(`TEST_CONT_NAME: ${TEST_CONT_NAME}`);

    const payerKeypair = Keypair.generate();
    const programData = Buffer.from("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf", "hex");

    testCont.draft({
      payer: payerKeypair,
      programId: "3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf",
      programData: programData,
    });

    const contractFilePath = path.join(TEST_CONT_PATH, `${TEST_CONT_NAME}.sol`);
    console.log(`Contract file path: ${contractFilePath}`);

    // Log the current working directory
    console.log(`Current working directory: ${process.cwd()}`);

    // Log the contents of the TEST_CONT_PATH directory
    console.log(`Contents of TEST_CONT_PATH directory: ${fs.readdirSync(TEST_CONT_PATH)}`);

    expect(fs.existsSync(contractFilePath)).to.be.true;
  });
});
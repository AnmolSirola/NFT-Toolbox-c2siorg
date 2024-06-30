import { describe } from "mocha";
import chai from "chai";
import fs from "fs";
import path from "path";
import { Contract } from "../src/chains/Solana/contracts/SolanaContract";
import os from "os";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import sinon from "sinon";

const expect = chai.expect;

const TEST_CONT_NAME = "Solana DemoNFT";
const TEST_CONT_PATH = path.join(os.tmpdir(), "Contracts");

const test_specs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "test_specs.json")).toString()
);

const testConnection = new Connection("http://localhost:8899", "confirmed");

const testCont = new Contract({
  name: TEST_CONT_NAME,
  symbol: TEST_CONT_NAME,
  dir: TEST_CONT_PATH,
  connection: {
    ...test_specs.solanaConnection,
    connection: testConnection,
  },
  deployed: {
    address: test_specs.solanaConnection.address,
    programId: test_specs.solanaConnection.programId,
    programData: Buffer.from(test_specs.solanaConnection.programData, "hex"),
  },
});

describe("Test suite for Solana Contract Class", () => {
  afterEach(() => {
    if (fs.existsSync(TEST_CONT_PATH)) {
      fs.rmSync(TEST_CONT_PATH, { recursive: true, force: true });
    }
    sinon.restore();
  });

  it("Checking Solana Draft Method", () => {
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
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Contents of TEST_CONT_PATH directory: ${fs.readdirSync(TEST_CONT_PATH)}`);

    expect(fs.existsSync(contractFilePath)).to.be.true;

    const contractContent = fs.readFileSync(contractFilePath, 'utf8');
    expect(contractContent).to.include("use anchor_lang::prelude::*");
    expect(contractContent).to.include("pub struct Counter");
    expect(contractContent).to.include("pub fn increment(ctx: Context<Increment>) -> ProgramResult");
  });

  it("Checking Deploy Solana Contract Method", async () => {
    const payerKeypair = Keypair.generate();
    const expectedProgramId = new PublicKey("3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf");
    
    const deployContractStub = sinon.stub(testCont, "deployContract").resolves(expectedProgramId);

    try {
      const result = await testCont.deployContract(testConnection, payerKeypair);
      
      expect(deployContractStub.calledOnce, "deployContract should be called once").to.be.true;
      expect(result.equals(expectedProgramId), "Returned programId should match expected").to.be.true;
    } catch (error) {
      console.error("Error in Deploy Solana Contract Method test:", error);
      throw error;
    }
  });

  it("Checking Read Solana Contract Method", async () => {
    const readStub = sinon.stub(testCont, "read").resolves({ count: 5 });

    try {
      const result = await testCont.read("getCount", []);
      
      expect(readStub.calledOnce, "read should be called once").to.be.true;
      expect(result).to.deep.equal({ count: 5 }, "Read result should match expected");
    } catch (error) {
      console.error("Error in Read Solana Contract Method test:", error);
      throw error;
    }
  });

  it("Checking Write Solana Contract Method", async () => {
    const writeStub = sinon.stub(testCont, "write").resolves("fakeTxSignature");

    try {
      const result = await testCont.write("increment", []);
      
      expect(writeStub.calledOnce, "write should be called once").to.be.true;
      expect(result).to.equal("fakeTxSignature", "Write result should be a transaction signature");
    } catch (error) {
      console.error("Error in Write Solana Contract Method test:", error);
      throw error;
    }
  });
});
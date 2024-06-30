import fs from "fs";
import path from "path";
import { SystemProgram, Keypair, Connection, Transaction, TransactionInstruction,
   PublicKey, sendAndConfirmTransaction, Commitment} from "@solana/web3.js";
import { Idl } from '@project-serum/anchor';

const wasmFilePath = '../../../../native/target/wasm32-unknown-unknown/debug/native.wasm';

type networks = "devnet" | "testnet" | "mainnet-beta";

export interface DraftOptions {
  // Solana-specific options
  payer: Keypair;
  programId: string;
  programData: Buffer;
}

export interface DeployConfigs {
  rpc: string;
  network: networks;
  connection: Connection;
  payer: Keypair;
  idl: Idl;
}

interface DeployedInstance {
  address: string;
}

export interface ContractAttributes {
  dir: fs.PathLike;
  name: string;
  symbol: string;
  connection: DeployConfigs;
  deployed?: {
    address: string;
    programId: string;
    programData?: Buffer;
  };
}

export class Contract {
  dir: fs.PathLike;
  name: string;
  symbol: string;

  payer: Keypair;
  programId: string;
  programData: Buffer;
  connection: Connection;
  idl: Idl;

  deployedInstance: string | undefined = undefined;
  rpc: string;

  constructor(attr: ContractAttributes) {
    this.dir = attr.dir;
    this.name = attr.name;
    this.symbol = attr.symbol;

    this.connection = attr.connection.connection;
    this.payer = attr.connection.payer;
    this.programId = attr.deployed?.programId || "";
    this.programData = attr.deployed?.programData || Buffer.alloc(0);
    this.deployedInstance = attr.deployed?.address;
    this.rpc = attr.connection.rpc;
    this.idl = attr.connection.idl;
  }

  print(contractCode: string): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    fs.writeFileSync(
      path.join(this.dir.toString(), `${this.name}.sol`),
      contractCode,
      { flag: "w" }
    );
  }

  draft(options: DraftOptions): void {
    // const contractCode = ""; //
    const contractCode = `
      // Simple Solana smart contract
      program {
        // Define the state struct
        struct State {
          u64 count;
        }

        // Define the program's entrypoint
        entrypoint (ctx: Context, instructionData: Buffer) -> ProgramResult {
          // Parse the instruction data
          let instruction = parseInstruction(instructionData);

          // Initialize the state
          let state = State { count: 0 };

          // Perform the requested action
          if (instruction.method == "increment") {
            state.count += instruction.args[0];
          } else if (instruction.method == "decrement") {
            state.count -= instruction.args[0];
          }

          // Serialize and save the state
          let stateData = serialize(state);
          let stateAccount = &mut ctx.accounts.state;
          stateAccount.data = stateData;

          // Return the updated state
          return ProgramResult::Ok(stateData);
        }

        // Parse the instruction data
        fn parseInstruction(instructionData: &[u8]) -> Instruction {
          let instruction = deserialize(instructionData).unwrap();
          return instruction;
        }

        // Serialize the state
        fn serialize(state: State) -> Vec<u8> {
          let stateData = borsh::BorshSerialize::try_to_vec(&state).unwrap();
          return stateData;
        }

        // Deserialize the state
        fn deserialize(stateData: &[u8]) -> Option<Instruction> {
          let instruction = borsh::BorshDeserialize::try_from_slice(stateData).unwrap();
          return instruction;
        }

        // Define the instruction struct
        #[derive(BorshSerialize, BorshDeserialize)]
        struct Instruction {
          method: String,
          args: Vec<u64>,
        }
      }
    `;
    this.print(contractCode);
    console.log(`Contract created : ${this.dir}`);
  }

// Function to deploy a Solana smart contract
// This code creates a new Solana program account, loads the provided 
// bytecode into the account, and returns the program account's public key.
async deployContract(connection: Connection, payer: Keypair): Promise<PublicKey> {
  // Load the payer's account information
  const payerAccountInfo = await connection.getAccountInfo(payer.publicKey);
  if (!payerAccountInfo) {
    throw new Error('Payer account not found');
  }

  // Read the WASM file from disk
  const programBytes = fs.readFileSync(wasmFilePath);

  // Create a new account for the program
  const programAccount = new Keypair();
  const programId = programAccount.publicKey;

  // Build the transaction to deploy the program
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: programId,
      lamports: await connection.getMinimumBalanceForRentExemption(programBytes.length),
      space: programBytes.length,
      programId: new PublicKey('11111111111111111111111111111111'), 
    })
  );

  // Convert the Uint8Array to a Buffer for data parameter
  const programBytesBuffer = Buffer.from(programBytes);

  // Add an instruction to load the program bytes into the program account
  transaction.add(
    new TransactionInstruction({
      keys: [{ pubkey: programId, isWritable: true, isSigner: false }],
      programId: new PublicKey('11111111111111111111111111111111'), // System program ID
      data: programBytesBuffer,
    })
  );

  // Sign and send the transaction
  await sendAndConfirmTransaction(connection, transaction, [payer]);

  console.log(`Contract deployed with program ID: ${programId.toBase58()}`);

  return programId;
}

  async write(method: string, args: any[]): Promise<string> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    const programId = new PublicKey(this.programId);
    const programAccount = new PublicKey(this.deployedInstance);
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: true }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.payer],
      { commitment: "singleGossip", preflightCommitment: "singleGossip" }
    );

    console.log(`Transaction ${signature} sent to ${this.deployedInstance}`);
    return signature;
  }

  async read(method: string, args: any[]): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    const programId = new PublicKey(this.programId);
    const programAccount = new PublicKey(this.deployedInstance);
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: true }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    const sendOptions = {
      skipPreflight: false,
      preflightCommitment: 'singleGossip' as Commitment,
      commitment: 'singleGossip' as Commitment,
      signers: [this.payer],
    };

    const transaction = new Transaction().add(instruction);
    const result = await this.connection.sendEncodedTransaction(
      transaction.serialize().toString(),
      sendOptions,// Create SendOptions object with signers property
    );
    console.log(`Result of ${method} call: ${result}`);
    return result;
  }
}
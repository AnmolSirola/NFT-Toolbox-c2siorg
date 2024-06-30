import fs from "fs";
import path from "path";
import { 
  SystemProgram, 
  Keypair, 
  Connection, 
  Transaction, 
  TransactionInstruction,
  PublicKey, 
  sendAndConfirmTransaction, 
} from "@solana/web3.js";
import { Idl } from '@project-serum/anchor';

const wasmFilePath = '../../../../native/target/wasm32-unknown-unknown/debug/native.wasm';

type networks = "devnet" | "testnet" | "mainnet";

export interface DraftOptions {
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
    const contractCode = `
      // Simple Solana smart contract
      use anchor_lang::prelude::*;

      declare_id!("${options.programId}");

      #[program]
      pub mod ${this.name.toLowerCase()} {
        use super::*;

        pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
          let counter = &mut ctx.accounts.counter;
          counter.count = 0;
          Ok(())
        }

        pub fn increment(ctx: Context<Increment>) -> ProgramResult {
          let counter = &mut ctx.accounts.counter;
          counter.count += 1;
          Ok(())
        }
      }

      #[derive(Accounts)]
      pub struct Initialize<'info> {
        #[account(init, payer = payer, space = 8 + 8)]
        pub counter: Account<'info, Counter>,
        #[account(mut)]
        pub payer: Signer<'info>,
        pub system_program: Program<'info, System>,
      }

      #[derive(Accounts)]
      pub struct Increment<'info> {
        #[account(mut)]
        pub counter: Account<'info, Counter>,
      }

      #[account]
      pub struct Counter {
        pub count: u64,
      }
    `;
    this.print(contractCode);
    console.log(`Contract created : ${this.dir}`);
  }

  async deployContract(connection: Connection, payer: Keypair): Promise<PublicKey> {
    const payerAccountInfo = await connection.getAccountInfo(payer.publicKey);
    if (!payerAccountInfo) {
      throw new Error('Payer account not found');
    }

    const programBytes = fs.readFileSync(wasmFilePath);
    const programAccount = new Keypair();
    const programId = programAccount.publicKey;

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: programId,
        lamports: await connection.getMinimumBalanceForRentExemption(programBytes.length),
        space: programBytes.length,
        programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
      })
    );

    const programBytesBuffer = Buffer.from(programBytes);

    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: programId, isWritable: true, isSigner: false }],
        programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
        data: programBytesBuffer,
      })
    );

    await sendAndConfirmTransaction(connection, transaction, [payer, programAccount]);

    console.log(`Contract deployed with program ID: ${programId.toBase58()}`);
    this.deployedInstance = programId.toBase58();

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
      { commitment: "confirmed", preflightCommitment: "confirmed" }
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
      keys: [{ pubkey: programAccount, isSigner: false, isWritable: false }],
      programId,
      data: Buffer.from(JSON.stringify({ method, args })),
    });

    const transaction = new Transaction().add(instruction);
    const simulationResult = await this.connection.simulateTransaction(transaction);

    console.log(`Result of ${method} call: ${JSON.stringify(simulationResult.value)}`);
    return simulationResult.value;
  }
}
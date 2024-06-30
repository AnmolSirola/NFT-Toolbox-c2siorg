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

let spl_token: any;

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

  splTokenMint: PublicKey | undefined;

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

  private static async initSplToken() {
    if (!spl_token) {
      spl_token = await import('@solana/spl-token');
    }
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
      // Simple Solana smart contract with SPL token support
      use anchor_lang::prelude::*;
      use anchor_spl::token::{self, Token};

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

        pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> ProgramResult {
          token::mint_to(
            CpiContext::new(
              ctx.accounts.token_program.to_account_info(),
              token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
              },
            ),
            amount,
          )?;
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

      #[derive(Accounts)]
      pub struct MintToken<'info> {
        #[account(mut)]
        pub mint: Account<'info, token::Mint>,
        #[account(mut)]
        pub token_account: Account<'info, token::TokenAccount>,
        #[account(mut)]
        pub payer: Signer<'info>,
        pub token_program: Program<'info, Token>,
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

    // Create SPL token mint after deployment
    await this.createSPLTokenMint(connection, payer);

    return programId;
  }

  async createSPLTokenMint(connection: Connection, payer: Keypair): Promise<void> {
    await Contract.initSplToken();

    const mintKeypair = Keypair.generate();
    this.splTokenMint = mintKeypair.publicKey;

    const lamports = await connection.getMinimumBalanceForRentExemption(spl_token.MINT_SIZE);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: spl_token.MINT_SIZE,
        lamports,
        programId: spl_token.TOKEN_PROGRAM_ID,
      }),
      spl_token.createInitializeMintInstruction(
        mintKeypair.publicKey,
        0,
        payer.publicKey,
        payer.publicKey
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
    console.log(`SPL Token mint created: ${this.splTokenMint.toBase58()}`);
  }

  async mintSPLToken(connection: Connection, payer: Keypair, recipient: PublicKey, amount: number): Promise<void> {
    await Contract.initSplToken();

    if (!this.splTokenMint) {
      throw new Error('SPL Token mint not created yet');
    }

    const associatedTokenAccount = await spl_token.getAssociatedTokenAddress(
      this.splTokenMint,
      recipient
    );

    const transaction = new Transaction().add(
      spl_token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAccount,
        recipient,
        this.splTokenMint
      ),
      spl_token.createMintToInstruction(
        this.splTokenMint,
        associatedTokenAccount,
        payer.publicKey,
        amount
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log(`Minted ${amount} tokens to ${recipient.toBase58()}`);
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
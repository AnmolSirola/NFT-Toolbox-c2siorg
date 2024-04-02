import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@project-serum/anchor';
import { IDL as NftLinkerIDL } from './NftLinker.json';
import { IDL as SolanaNFTIDL } from './SolanaNFT.json';

const deploySolanaContracts = async () => {
  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const wallet = new Wallet(Keypair.fromSecretKey(Buffer.from(process.env.SOLANA_PRIVATE_KEY)));
  const provider = new AnchorProvider(connection, wallet, {});

  // Deploy NftLinker contract
  const nftLinkerProgram = new Program(NftLinkerIDL, new PublicKey(process.env.SOLANA_NFTLINKER_PROGRAM_ID), provider);
  await nftLinkerProgram.methods.initialize(process.env.SOLANA_GATEWAY_ADDRESS).accounts({
    payer: wallet.publicKey,
  }).rpc();
  console.log('NftLinker deployed on Solana');

  // Deploy SolanaNFT contract
  const solanaNFTProgram = new Program(SolanaNFTIDL, new PublicKey(process.env.SOLANA_NFT_PROGRAM_ID), provider);
  await solanaNFTProgram.methods.initialize().accounts({
    payer: wallet.publicKey,
  }).rpc();
  console.log('SolanaNFT deployed on Solana');
};

deploySolanaContracts();x
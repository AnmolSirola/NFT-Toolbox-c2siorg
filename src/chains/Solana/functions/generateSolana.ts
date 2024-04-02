import path from 'path';
import { nftToolbox } from '../../../index';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

// Create a new connection to the Solana cluster
const connection = new Connection('https://api.devnet.solana.com', 'singleGossip');

// Create a new Keypair object for the payer
const payer = Keypair.generate();

// Initialize a new Solana collection
nftToolbox.initSolanaCollection({
  name: 'Demo Collection - Solana',
  dir: path.join(__dirname, "Demo Collection - Solana"),
  description: "This is a demo collection for NFT Toolbox in Solana",
  programId: new PublicKey('5zyx93d8GMmKrdKLqMykyQAm5EMMy2vC4GZbGnwQkcMX'),
  account: new PublicKey('5zyx93d8GMmKrdKLqMykyQAm5EMMy2vC4GZbGnwQkcMX'),
});

// Generate Solana NFTs
nftToolbox.generateSolanaNFTs({
  dir: path.join(__dirname, 'layers'),
  size: 100,
  layersOrder: [
    { name: 'background' },
    { name: 'first character' },
    { name: 'second character' },
    { name: 'third character' },
    { name: 'fourth character' },
  ],
  format: {
    width: 512,
    height: 512,
    smoothing: true,
  },
  background: {
    generate: true,
    static: false,
    brightness: 0.5,
  },
  dnaCollisionTolerance: 1000,
  rarityDelimiter: '#',
  rarityDefault: '1',
  shuffleIndexes: true,
  connection,
  payer,
});

import path from 'path';
import { nftToolbox } from "../../../index";
import { AptosClient, AptosAccount, HexString } from 'aptos';

// Create a new instance of AptosClient
const client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');

// Create a new AptosAccount instance with the private key
const privateKey = new HexString('0x7304Cf13eEE8c8C20C6569E2024fB9079184F430');
const account = new AptosAccount(privateKey.toUint8Array());

// Initialize a new Aptos collection
nftToolbox.initAptosCollection({
  name: 'Demo Collection - Aptos',
  dir: path.join(__dirname, 'Demo Collection - Aptos'),
  description: 'This is a demo collection for NFT Toolbox in Aptos',
  account,
});

// Generate Aptos NFTs
nftToolbox.generateAptosNFTs({
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
  client,
  account,
});
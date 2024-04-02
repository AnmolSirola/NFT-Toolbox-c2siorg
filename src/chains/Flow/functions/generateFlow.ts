import path from 'path';
import { nftToolbox } from "../../../index";
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

// Configure FCL with the Flow network endpoint and authentication details
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
});

// Define the private key for the account
const privateKey = '0x7304Cf13eEE8c8C20C6569E2024fB9079184F430';

// Create a new account instance using the private key
const account = fcl.account(privateKey);

// Initialize a new Flow collection
nftToolbox.initFlowCollection({
  name: 'Demo Collection - Flow',
  dir: path.join(__dirname, 'Demo Collection - Flow'),
  description: 'This is a demo collection for NFT Toolbox in Flow',
  account,
});

// Generate Flow NFTs
nftToolbox.generateFlowNFTs({
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
  account,
});
import path from 'path';
import { nftToolbox } from "../../../index";
import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';

// Create a new instance of TezosToolkit
const tezos = new TezosToolkit('https://api.tez.ie/rpc/granadanet');

// Create a new InMemorySigner instance with the private key
const privateKey = 'edskRuycScUrc5KqgiWZXWFa4STEAxJSs18ZXLDdfbDGkiwPWne1QjD4TwRzfDqYXgMwVN2dkDYHBVhPZZDxGDNDneAVNErRvv';
const signer = new InMemorySigner(privateKey);

// Initialize the Tezos collection
nftToolbox.initTezosCollection({
  name: 'Demo Collection - Tezos',
  dir: path.join(__dirname, 'Demo Collection - Tezos'),
  description: 'This is a demo collection for NFT Toolbox in Tezos',
  standard: 'FA2',
  signer,
});

// Generate Tezos NFTs
nftToolbox.generateTezosNFTs({
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
  tezos,
  signer,
});
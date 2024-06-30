import fs from 'fs';
import path from 'path';
import { nftToolbox } from '../../../index';
import { Keypair } from '@solana/web3.js';

const payerKeypair = Keypair.generate();
const programData = Buffer.from('3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf', 'hex');

nftToolbox.initSolanaContract({
  name: 'DemoContract',
  symbol: 'DEMO',
  dir: path.join(__dirname, 'Contracts'),
  connection: JSON.parse(
    fs.readFileSync(path.join(__dirname, 'connection.json')).toString()
  ),
});

nftToolbox.draftSolanaContract({
  payer: payerKeypair,
  programId: '3Fp6nVU22pfyv3jbLLoDHrj3yaNdKDWoe2qtCtbn38Bf',
  programData: programData,
});
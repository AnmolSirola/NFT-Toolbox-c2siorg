import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import NFT from './NFT.json'

const web3 = new Web3('http://localhost:8545'); // replace this URL with the Ethereum node URL

const myNFTContract = new web3.eth.Contract(
  NFT.abi as AbiItem[],
  '0x1U2v3W4x5Y6z7A8b9C0d1E2f3G4h5I6j7K8l9M0n'
);

async function offChain(recipients: string[], tokenIds: number[]) {
  const batchSize = 10; // number of NFTs to mint in each transaction, let it be 10 here.
  const numBatches = Math.ceil(recipients.length / batchSize);

  for (let i = 0; i < numBatches; i++) {
    const start = i * batchSize;
    const end = Math.min((i + 1) * batchSize, recipients.length);
    const batchRecipients = recipients.slice(start, end);
    const batchTokenIds = tokenIds.slice(start, end);

    await myNFTContract.methods
      .batchMint(batchRecipients, batchTokenIds)
      .send({ from: '<Our Ethereum address>' });
  }
}

// example usage
const recipients = [
   '0x7a2C1f0B5d8c1a0E1f6G3h4I5j6K7l8M9n0O1p2Q', /*Address 1 of recipient */
   '0x9Rf3S4t5U6v7W8x9Y0z1A2b3C4d5E6f7G8h9I0j1', /*Address 2 of recipient */
   '0x2k3L4m5N6o7P8q9R0s1T2u3V4w5X6y7Z8a9B0c1D', /*Address 3 of recipient */
];

const tokenIds = [0, 1, 2];

offChain(recipients, tokenIds);
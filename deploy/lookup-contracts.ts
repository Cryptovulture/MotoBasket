/**
 * Look up deployed contract hex addresses via their deployment TX hashes.
 */

import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider({ url: 'https://testnet.opnet.org', network: networks.opnetTestnet });

const deployments = [
  { name: 'OPAI', txHash: '87f0d25936fd495fd04e8daac23aa0c8405f09150319a32b93b5b51ea34828ba' },
  { name: 'OPMEME', txHash: 'bf4375e647bb2b51bcb5add47575f20e6069e90c68e795f9766d810748fe115c' },
  { name: 'OPDEFI', txHash: 'd5ad331f2f618cb5f1a184c96a27594a8e9ccaebec06d9d8f4125b99a82d7168' },
];

async function main() {
  for (const { name, txHash } of deployments) {
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        console.log(`${name}: TX not found (not yet confirmed?)`);
        continue;
      }
      console.log(`\n${name} TX receipt:`, JSON.stringify(tx, (key, val) =>
        typeof val === 'bigint' ? val.toString() : val, 2).slice(0, 500));

      // Check for contract address in receipt
      if ((tx as any).contractAddress) {
        console.log(`${name} contractAddress:`, (tx as any).contractAddress);
      }
      if ((tx as any).deployedContractAddress) {
        console.log(`${name} deployedContractAddress:`, (tx as any).deployedContractAddress);
      }

      // Log all string fields
      for (const [k, v] of Object.entries(tx as any)) {
        if (typeof v === 'string' && v.startsWith('0x') && v.length === 66) {
          console.log(`${name} ${k}: ${v}`);
        }
      }
    } catch (e: any) {
      console.log(`${name}: Error:`, e.message?.slice(0, 150));
    }
  }
}

main().then(() => process.exit(0));

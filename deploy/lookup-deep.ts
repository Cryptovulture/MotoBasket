import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider({ url: 'https://testnet.opnet.org', network: networks.opnetTestnet });

async function main() {
  const tx = await provider.getTransaction('87f0d25936fd495fd04e8daac23aa0c8405f09150319a32b93b5b51ea34828ba');
  if (!tx) {
    console.log('TX not found');
    return;
  }

  // Print ALL keys and types
  function printObj(obj: any, prefix: string = '', depth: number = 0) {
    if (depth > 3) return;
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'bigint') {
        console.log(`${prefix}${k}: ${v.toString()} (bigint)`);
      } else if (typeof v === 'string') {
        console.log(`${prefix}${k}: ${v.slice(0, 80)} (string, len=${v.length})`);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        console.log(`${prefix}${k}: ${v}`);
      } else if (Array.isArray(v)) {
        console.log(`${prefix}${k}: Array[${v.length}]`);
      } else if (v instanceof Uint8Array) {
        console.log(`${prefix}${k}: Uint8Array[${v.length}] ${Buffer.from(v).toString('hex').slice(0, 80)}`);
      } else if (typeof v === 'object') {
        console.log(`${prefix}${k}: {object}`);
        printObj(v, prefix + '  ', depth + 1);
      }
    }
  }

  printObj(tx);
}

main().then(() => process.exit(0));

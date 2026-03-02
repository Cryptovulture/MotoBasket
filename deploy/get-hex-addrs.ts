/**
 * Quick script to get hex contract addresses from the deployed contracts.
 * Uses getPublicKeyInfo to look up the contract address mapping.
 */

import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider({ url: 'https://testnet.opnet.org', network: networks.opnetTestnet });

const contracts = [
  ['OPAI', 'opt1sqqr4klkkms6kspj59pewm03j3e4a93cmgvxj6vv6'],
  ['OPMEME', 'opt1sqpedtf86khhf474clf24ehhws6h8tx36v534wkfx'],
  ['OPDEFI', 'opt1sqpyly85t8ktq04az578q0kefmfh3g2ttwvktdg02'],
];

async function main() {
  for (const [name, p2op] of contracts) {
    try {
      const info = await provider.getPublicKeyInfo(p2op);
      console.log(`${name}:`, JSON.stringify(info, null, 2));
    } catch (e: any) {
      console.log(`${name}: Error:`, e.message?.slice(0, 100));
    }
  }

  // Also try getCode
  for (const [name, p2op] of contracts) {
    try {
      const code = await (provider as any).getCode(p2op, true);
      console.log(`\n${name} code check:`, code ? `${code.bytecode?.length ?? 0} bytes` : 'null');
    } catch (e: any) {
      console.log(`\n${name} getCode error:`, e.message?.slice(0, 100));
    }
  }
}

main().then(() => process.exit(0));

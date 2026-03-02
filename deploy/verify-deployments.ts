import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const provider = new JSONRpcProvider({ url: 'https://testnet.opnet.org', network: networks.opnetTestnet });

const deployments = [
  { name: 'OPAI', txHash: 'aab771ed1bf7c3340eebb703c2e08c65909b3f5a678587a04a56b6484f3c854c' },
  { name: 'OPMEME', txHash: '56d3dfdd14ea0389a8353a01a919a3d7e55894621e20900a520cb8f8c078d5d7' },
  { name: 'OPDEFI', txHash: '8b2704d47dc187d49489f3cf0475dfda9aeaaf24738cb2e1ecba196212f55923' },
];

async function main() {
  for (const { name, txHash } of deployments) {
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        console.log(`${name}: TX not found yet`);
        continue;
      }
      const failed = (tx as any).failed;
      const revert = (tx as any).revert;
      const contractAddress = (tx as any).contractAddress;
      const contractPubKey = (tx as any).contractPublicKey;
      const hexAddr = contractPubKey ? '0x' + Buffer.from(contractPubKey).toString('hex') : 'N/A';

      console.log(`${name}: ${failed ? 'FAILED' : 'SUCCESS'} | P2OP: ${contractAddress} | Hex: ${hexAddr}`);
      if (revert) console.log(`  Revert: ${revert}`);
    } catch (e: any) {
      console.log(`${name}: Error: ${e.message?.slice(0, 100)}`);
    }
  }
}

main().then(() => process.exit(0));

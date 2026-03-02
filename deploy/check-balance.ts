import * as bip39 from 'bip39';
import BIP32Factory from '@btc-vision/bip32';
import { createNobleBackend } from '@btc-vision/ecpair';
import { networks } from '@btc-vision/bitcoin';
import { EcKeyPair } from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';

const backend = createNobleBackend();
const bip32 = BIP32Factory(backend);
const mnemonic = 'section middle cake piano brand doctor marine private pass easily immense sun';
const seed = bip39.mnemonicToSeedSync(mnemonic);
const root = bip32.fromSeed(seed, networks.opnetTestnet);

const provider = new JSONRpcProvider({ url: 'https://testnet.opnet.org', network: networks.opnetTestnet });

const paths = ["m/86'/1'/0'/0/0", "m/86'/0'/0'/0/0"];

async function main() {
  for (const path of paths) {
    const child = root.derivePath(path);
    const wif = child.toWIF();
    const signer = EcKeyPair.fromWIF(wif, networks.opnetTestnet);
    const p2tr = EcKeyPair.getTaprootAddress(signer, networks.opnetTestnet);

    try {
      const utxos = await provider.utxoManager.getUTXOs({ address: p2tr });
      const total = utxos.reduce((s: bigint, u: any) => s + BigInt(u.value), 0n);
      console.log(path, '->', p2tr, '| UTXOs:', utxos.length, '| Balance:', total.toString(), 'sats');
    } catch (e: any) {
      console.log(path, '->', p2tr, '| Error:', e.message?.slice(0, 100));
    }
  }
  process.exit(0);
}

main();

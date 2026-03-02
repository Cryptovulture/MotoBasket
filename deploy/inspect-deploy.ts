/**
 * Inspect a deployment result to find the hex contract address.
 * Does a mock sign (smallest possible) just to see the result shape.
 */

import * as bip39 from 'bip39';
import BIP32Factory from '@btc-vision/bip32';
import { createNobleBackend } from '@btc-vision/ecpair';
import { networks } from '@btc-vision/bitcoin';
import {
  TransactionFactory,
  BinaryWriter,
  EcKeyPair,
  Address,
  QuantumBIP32Factory,
  QuantumDerivationPath,
} from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';

const NETWORK = networks.opnetTestnet;
const MNEMONIC = 'section middle cake piano brand doctor marine private pass easily immense sun';

async function main() {
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const backend = createNobleBackend();
  const bip32 = BIP32Factory(backend);
  const ecRoot = bip32.fromSeed(seed, NETWORK);
  const ecChild = ecRoot.derivePath("m/86'/0'/0'/0/0");
  const signer = EcKeyPair.fromWIF(ecChild.toWIF(), NETWORK);
  const p2tr = EcKeyPair.getTaprootAddress(signer, NETWORK);

  const qRoot = QuantumBIP32Factory.fromSeed(seed, NETWORK);
  const mldsaSigner = qRoot.derivePath(QuantumDerivationPath.STANDARD);

  const provider = new JSONRpcProvider({ url: 'https://testnet.opnet.org', network: NETWORK });
  const utxos = await provider.utxoManager.getUTXOs({ address: p2tr });

  const challenge = await provider.getChallenge();

  // Minimal bytecode (just to see the result shape)
  const calldata = new BinaryWriter();
  calldata.writeStringWithLength('Test');
  calldata.writeStringWithLength('TST');

  const factory = new TransactionFactory();
  const deployment = await factory.signDeployment({
    from: p2tr,
    utxos,
    signer,
    mldsaSigner,
    network: NETWORK,
    feeRate: 10,
    priorityFee: 0n,
    gasSatFee: 100_000n,
    bytecode: new Uint8Array([0]), // dummy
    calldata: calldata.getBuffer(),
    challenge,
  });

  // Inspect ALL properties
  console.log('Keys:', Object.keys(deployment));
  console.log('contractAddress:', deployment.contractAddress);
  console.log('contractPubKey:', (deployment as any).contractPubKey);
  console.log('contractAddress type:', typeof deployment.contractAddress);

  // Check for any hex-like fields
  for (const [key, val] of Object.entries(deployment)) {
    if (key === 'transaction') continue; // skip TX hex
    if (typeof val === 'string' && val.length > 40) {
      console.log(`${key} (string, ${val.length}):`, val.slice(0, 80));
    } else if (val instanceof Uint8Array) {
      console.log(`${key} (Uint8Array, ${val.length}):`, Buffer.from(val).toString('hex').slice(0, 80));
    }
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e.message);
  process.exit(1);
});

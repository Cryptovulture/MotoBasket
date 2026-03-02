/**
 * MotoBasket — Deploy all 3 IndexToken contracts sequentially.
 * Waits for each to confirm before deploying the next.
 * Auto-updates src/config/indexes.ts with new addresses.
 *
 * Usage:  npx tsx deploy-all.ts
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Network ─────────────────────────────────────────────────────────
const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;

// ── Wallet ──────────────────────────────────────────────────────────
const MNEMONIC = process.env.MNEMONIC || 'section middle cake piano brand doctor marine private pass easily immense sun';
const EC_PATH = "m/86'/0'/0'/0/0";

// ── Contract addresses ──────────────────────────────────────────────
const MOTO_TOKEN = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

// ── Pre-queried pair addresses (MOTO/<token> from MotoSwap Factory) ──
const PAIRS: Record<string, string> = {
  '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f': '0x528352dc4b0b8aea18e9a9a92378f75390ede88d17e0bde754c9d2c822599c5c', // NRNA
  '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c': '0x65ac96f5e99e0109c20e606d74f2b1ad3d200378c5f5485aa18f3fb9ad50fec1', // SYNP
  '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c': '0x9a3a20391f916ff18040ac9c29889bd59ef4a7f27aa74e1f57aef78a36148f5c', // CRTX
  '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7': '0x270063d920c1bbfa19edacc563e41d268f7ed63f067ced86422479ecac2a1833', // DPLR
  '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940': '0x236453461cb8ecb2e2c384921a28cdcaa4089b90b116686ed647d7081bffa419', // CPHR
  '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6': '0xa6fd538786d91ce70013fa71489219db91b2ebc575e301ed3a45a9a6bcc7f14f', // PEEP
  '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22': '0x73ca3b95ae58eb57f18467c6c0670c33664970a5ce5fa9c3cc615cf7242064c4', // DGEN
  '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258': '0x76455b069d8f06fbd13ddb5a07581470b891dfe13467551aa0ec94d9aece23aa', // BONQ
  '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383': '0x7d674c47e2dbd7c666e793c1e89834fa5573bbeda31253189092a95d0828a665', // SHBA
  '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18': '0x05e4f00e89056c295565340e4b238a685dedcfc49a4b0b8b025b620a0af96d85', // LNDB
  '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b': '0x58a1da36149de67c55c483f7c2ba18dd83b1636b4bea363a99b9f30caca8eaa3', // YLDP
  '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46': '0x5f9531cf52a2f484e6804f1c34c92a4faacb0fb41b7a95355cdb25d0d8d95b03', // SWPX
  '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04': '0x032ee52958b133ceeb5b1249f2094060ac655c5e897adb3399a702023fb627e0', // NEBL
};

// ── Index definitions ───────────────────────────────────────────────
interface IndexDef {
  name: string;
  symbol: string;
  components: { address: string; weightBps: number }[];
}

const INDEXES: IndexDef[] = [
  {
    name: 'OPNet AI Index',
    symbol: 'OPAI',
    components: [
      { address: '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f', weightBps: 2000 },
      { address: '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c', weightBps: 2000 },
      { address: '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c', weightBps: 2000 },
      { address: '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7', weightBps: 2000 },
      { address: '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940', weightBps: 2000 },
    ],
  },
  {
    name: 'OPNet Meme Index',
    symbol: 'OPMEME',
    components: [
      { address: '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6', weightBps: 2500 },
      { address: '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22', weightBps: 2500 },
      { address: '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258', weightBps: 2500 },
      { address: '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383', weightBps: 2500 },
    ],
  },
  {
    name: 'OPNet DeFi Index',
    symbol: 'OPDEFI',
    components: [
      { address: '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18', weightBps: 2500 },
      { address: '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b', weightBps: 2500 },
      { address: '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46', weightBps: 2500 },
      { address: '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04', weightBps: 2500 },
    ],
  },
];

// ── Calldata builder ────────────────────────────────────────────────

function buildCalldata(def: IndexDef): Uint8Array {
  const writer = new BinaryWriter();

  writer.writeStringWithLength(def.name);
  writer.writeStringWithLength(def.symbol);
  writer.writeAddress(Address.fromString(MOTO_TOKEN));
  writer.writeU256(BigInt(def.components.length));

  for (const comp of def.components) {
    const pairAddr = PAIRS[comp.address];
    if (!pairAddr) throw new Error(`No pair address for ${comp.address}`);

    writer.writeAddress(Address.fromString(comp.address));
    writer.writeU256(BigInt(comp.weightBps));
    writer.writeAddress(Address.fromString(pairAddr));
  }

  return writer.getBuffer();
}

// ── Wallet ──────────────────────────────────────────────────────────

function deriveWallet() {
  const seed = bip39.mnemonicToSeedSync(MNEMONIC);
  const backend = createNobleBackend();
  const bip32 = BIP32Factory(backend);
  const ecRoot = bip32.fromSeed(seed, NETWORK);
  const ecChild = ecRoot.derivePath(EC_PATH);
  const signer = EcKeyPair.fromWIF(ecChild.toWIF(), NETWORK);
  const p2tr = EcKeyPair.getTaprootAddress(signer, NETWORK);
  const qRoot = QuantumBIP32Factory.fromSeed(seed, NETWORK);
  const mldsaSigner = qRoot.derivePath(QuantumDerivationPath.STANDARD);
  return { signer, mldsaSigner, p2tr };
}

// ── Wait for block confirmation ─────────────────────────────────────

let rpcId = 0;
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  if (!resp.ok) throw new Error(`RPC HTTP ${resp.status}`);
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

async function waitForConfirmation(hexAddr: string, maxAttempts = 40): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const result = await rpcCall('btc_getCode', [hexAddr]) as { bytecode?: string };
      if (result?.bytecode && result.bytecode.length > 10) {
        return true;
      }
    } catch { /* not confirmed yet */ }
    process.stdout.write(`  Waiting for confirmation... (${i + 1}/${maxAttempts})\r`);
  }
  return false;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n========================================');
  console.log('  MotoBasket V10 — Deploy All Indexes (fee fix)');
  console.log('========================================\n');

  const { signer, mldsaSigner, p2tr } = deriveWallet();
  console.log('Deployer:', p2tr);

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  // Read WASM
  const wasmPath = path.resolve(__dirname, '../contract/build/release.wasm');
  if (!fs.existsSync(wasmPath)) {
    console.error('WASM not found at', wasmPath);
    process.exit(1);
  }
  const bytecode = new Uint8Array(fs.readFileSync(wasmPath));
  console.log(`Bytecode: ${bytecode.length} bytes\n`);

  const results: { symbol: string; hexAddr: string }[] = [];

  for (let idx = 0; idx < INDEXES.length; idx++) {
    const def = INDEXES[idx];
    console.log(`\n--- [${idx + 1}/${INDEXES.length}] Deploying ${def.symbol} ---`);

    const calldata = buildCalldata(def);
    console.log(`  Calldata: ${calldata.length} bytes`);

    // Refresh UTXOs before each deployment
    console.log('  Fetching UTXOs...');
    const utxos = await provider.utxoManager.getUTXOs({ address: p2tr });
    const totalSats = utxos.reduce((s: bigint, u: any) => s + BigInt(u.value), 0n);
    console.log(`  UTXOs: ${utxos.length} (${totalSats} sats)`);

    if (utxos.length === 0) {
      console.error('  No UTXOs! Cannot continue.');
      break;
    }

    // Get challenge
    console.log('  Solving epoch challenge...');
    const challenge = await provider.getChallenge();

    // Sign
    console.log('  Signing deployment...');
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
      bytecode,
      calldata,
      challenge,
    });

    const hexAddr = '0x' + (deployment.contractPubKey || '').replace(/^0x/, '');
    console.log(`  Contract: ${hexAddr}`);

    // Broadcast
    console.log('  Broadcasting funding TX...');
    const fundResult = await provider.sendRawTransaction(deployment.transaction[0], false);
    console.log(`  Funding: ${JSON.stringify(fundResult).slice(0, 120)}`);

    console.log('  Broadcasting deployment TX...');
    const revealResult = await provider.sendRawTransaction(deployment.transaction[1], false);
    console.log(`  Reveal: ${JSON.stringify(revealResult).slice(0, 120)}`);

    results.push({ symbol: def.symbol, hexAddr });

    // Wait for confirmation before next deployment
    if (idx < INDEXES.length - 1) {
      console.log('  Waiting for block confirmation...');
      const confirmed = await waitForConfirmation(hexAddr);
      if (confirmed) {
        console.log('  Confirmed!');
      } else {
        console.log('  Warning: not confirmed yet, proceeding anyway...');
      }
    }
  }

  // Print summary
  console.log('\n========================================');
  console.log('  DEPLOYMENT RESULTS');
  console.log('========================================');
  for (const r of results) {
    console.log(`  ${r.symbol}: ${r.hexAddr}`);
  }

  // Auto-update indexes.ts
  const indexesPath = path.resolve(__dirname, '../src/config/indexes.ts');
  let indexesSrc = fs.readFileSync(indexesPath, 'utf-8');

  for (const r of results) {
    // Find the index config by symbol and replace its address
    const symbolPattern = new RegExp(
      `(symbol:\\s*'${r.symbol}'[\\s\\S]*?address:\\s*')([^']*)(')`,
    );
    const addressPattern = new RegExp(
      `(address:\\s*')([^']*?)'([\\s\\S]*?symbol:\\s*'${r.symbol}')`,
    );

    if (addressPattern.test(indexesSrc)) {
      indexesSrc = indexesSrc.replace(addressPattern, `$1${r.hexAddr}'$3`);
      console.log(`  Updated ${r.symbol} address in indexes.ts`);
    } else {
      console.log(`  Could not auto-update ${r.symbol} — manual update needed: ${r.hexAddr}`);
    }
  }

  fs.writeFileSync(indexesPath, indexesSrc);
  console.log('\nindexes.ts updated. Run: cd .. && npm run build');
}

main().catch((err) => {
  console.error('\nDeployment failed:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

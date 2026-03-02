/**
 * MotoBasket IndexToken V7 Deployment Script
 *
 * Deploys one IndexToken contract to OPNet testnet.
 * Automatically looks up MotoSwap pair addresses from Factory.
 *
 * Usage:
 *   INDEX=OPAI  npx tsx deploy.ts
 *   INDEX=OPMEME npx tsx deploy.ts
 *   INDEX=OPDEFI npx tsx deploy.ts
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
const MOTOSWAP_ROUTER = '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a';
const MOTO_TOKEN = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

// ── Index definitions ───────────────────────────────────────────────

interface IndexDef {
  name: string;
  symbol: string;
  components: { address: string; weightBps: number }[];
}

const INDEXES: Record<string, IndexDef> = {
  OPAI: {
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
  OPMEME: {
    name: 'OPNet Meme Index',
    symbol: 'OPMEME',
    components: [
      { address: '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6', weightBps: 2500 },
      { address: '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22', weightBps: 2500 },
      { address: '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258', weightBps: 2500 },
      { address: '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383', weightBps: 2500 },
    ],
  },
  OPDEFI: {
    name: 'OPNet DeFi Index',
    symbol: 'OPDEFI',
    components: [
      { address: '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18', weightBps: 2500 },
      { address: '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b', weightBps: 2500 },
      { address: '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46', weightBps: 2500 },
      { address: '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04', weightBps: 2500 },
    ],
  },
};

// ── RPC helpers (same pattern as rawRpc.ts) ─────────────────────────

let rpcId = 0;

function sha256Selector(signature: string): string {
  return createHash('sha256').update(signature).digest().slice(0, 4).toString('hex');
}

const SEL_FACTORY = sha256Selector('factory()');
const SEL_GET_POOL = sha256Selector('getPool(address,address)');

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

async function contractCall(calldata: string, contractAddress: string): Promise<Uint8Array> {
  const result = await rpcCall('btc_call', [contractAddress, calldata]) as {
    result?: string;
    revert?: string;
    error?: { message: string };
  };
  if (result.revert) throw new Error(`Reverted: ${result.revert}`);
  if (result.error) throw new Error(result.error.message);
  if (!result.result) throw new Error('No result from contract call');
  const binary = Buffer.from(result.result, 'base64');
  return new Uint8Array(binary);
}

function readAddress(buf: Uint8Array, offset: number): string {
  if (buf.length < offset + 32) return '0x' + '00'.repeat(32);
  let hex = '';
  for (let i = 0; i < 32; i++) hex += buf[offset + i].toString(16).padStart(2, '0');
  return '0x' + hex;
}

function encodeAddr(address: string): string {
  return address.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

// ── Pair lookup ─────────────────────────────────────────────────────

async function lookupPairAddresses(
  components: { address: string }[],
): Promise<string[]> {
  // Step 1: Get Factory address from Router
  console.log('  Calling Router.factory()...');
  console.log('  Factory selector:', SEL_FACTORY);
  const factoryBuf = await contractCall(SEL_FACTORY, MOTOSWAP_ROUTER);
  const factoryAddr = readAddress(factoryBuf, 0);
  console.log('  Factory address:', factoryAddr);

  // Step 2: Get pool for each component
  const pairs: string[] = [];
  for (const comp of components) {
    const calldata = SEL_GET_POOL + encodeAddr(MOTO_TOKEN) + encodeAddr(comp.address);
    console.log(`  Calling Factory.getPool(MOTO, ${comp.address.slice(0, 10)}...)...`);
    const poolBuf = await contractCall(calldata, factoryAddr);
    const poolAddr = readAddress(poolBuf, 0);

    if (poolAddr === '0x' + '00'.repeat(32)) {
      throw new Error(
        `No pool found for MOTO/${comp.address}.\n` +
        `Create the pool on MotoSwap first before deploying this index.`,
      );
    }

    pairs.push(poolAddr);
    console.log(`    -> pool: ${poolAddr}`);
  }

  return pairs;
}

// ── Calldata builder ────────────────────────────────────────────────

function buildCalldata(def: IndexDef, pairAddresses: string[]): Uint8Array {
  const writer = new BinaryWriter();

  // V7 format: name, symbol, motoAddr, compCount, [compAddr, weight, pairAddr]...
  writer.writeStringWithLength(def.name);
  writer.writeStringWithLength(def.symbol);
  writer.writeAddress(Address.fromString(MOTO_TOKEN));
  writer.writeU256(BigInt(def.components.length));

  for (let i = 0; i < def.components.length; i++) {
    writer.writeAddress(Address.fromString(def.components[i].address));
    writer.writeU256(BigInt(def.components[i].weightBps));
    writer.writeAddress(Address.fromString(pairAddresses[i]));
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

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const indexKey = process.env.INDEX;
  if (!indexKey || !INDEXES[indexKey]) {
    console.error('Set INDEX env var to one of:', Object.keys(INDEXES).join(', '));
    process.exit(1);
  }

  const def = INDEXES[indexKey];
  console.log(`\n=== Deploying ${def.symbol} (${def.name}) — V7 Direct Pair ===`);
  console.log(`Components: ${def.components.length}`);
  console.log(`Network: OPNet Testnet (${RPC_URL})\n`);

  // Look up pair addresses from MotoSwap Factory
  console.log('Looking up MotoSwap pair addresses...');
  const pairAddresses = await lookupPairAddresses(def.components);
  console.log(`Found ${pairAddresses.length} pairs.\n`);

  // Setup
  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
  const { signer, mldsaSigner, p2tr } = deriveWallet();
  console.log('Deployer:', p2tr);

  // Read WASM
  const wasmPath = path.resolve(__dirname, '../contract/build/release.wasm');
  if (!fs.existsSync(wasmPath)) {
    console.error('WASM not found at', wasmPath);
    console.error('Run: cd ../contract && npm run build');
    process.exit(1);
  }
  const bytecode = new Uint8Array(fs.readFileSync(wasmPath));
  console.log(`Bytecode: ${bytecode.length} bytes`);

  // Build calldata
  const calldata = buildCalldata(def, pairAddresses);
  console.log(`Calldata: ${calldata.length} bytes`);

  // Get UTXOs
  console.log('\nFetching UTXOs...');
  const utxos = await provider.utxoManager.getUTXOs({ address: p2tr });
  if (utxos.length === 0) {
    console.error('No UTXOs found. Fund this address first:', p2tr);
    process.exit(1);
  }
  const totalSats = utxos.reduce((s: bigint, u: any) => s + BigInt(u.value), 0n);
  console.log(`UTXOs: ${utxos.length} (${totalSats} sats)`);

  // Epoch challenge
  console.log('Solving epoch challenge...');
  const challenge = await provider.getChallenge();
  console.log('Challenge solved.');

  // Sign deployment
  console.log('\nSigning deployment...');
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

  console.log('Contract P2OP:', deployment.contractAddress);
  console.log('Contract hex:  0x' + deployment.contractPubKey.replace(/^0x/, ''));

  // Broadcast
  console.log('\nBroadcasting funding TX...');
  const fundResult = await provider.sendRawTransaction(deployment.transaction[0], false);
  console.log('Funding TX:', JSON.stringify(fundResult));

  console.log('Broadcasting deployment TX...');
  const revealResult = await provider.sendRawTransaction(deployment.transaction[1], false);
  console.log('Deployment TX:', JSON.stringify(revealResult));

  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log(`Index:    ${def.symbol}`);
  console.log(`P2OP:     ${deployment.contractAddress}`);
  console.log(`Hex:      0x${deployment.contractPubKey.replace(/^0x/, '')}`);
  console.log('\nPair addresses used:');
  for (let i = 0; i < pairAddresses.length; i++) {
    console.log(`  ${def.components[i].address.slice(0, 10)}... -> ${pairAddresses[i]}`);
  }
  console.log('\nUpdate src/config/indexes.ts with the hex address.');
  console.log('Wait ~30s for block confirmation.');
}

main().catch((err) => {
  console.error('\nDeployment failed:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

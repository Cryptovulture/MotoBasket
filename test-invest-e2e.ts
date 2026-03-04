/**
 * E2E test: Invest 10 MOTO into the new OPAI contract, then redeem.
 * Uses the deployer wallet (same keys as deploy script).
 *
 * Usage: npx tsx test-invest-e2e.ts
 */

import * as bip39 from 'bip39';
import BIP32Factory from '@btc-vision/bip32';
import { createNobleBackend } from '@btc-vision/ecpair';
import { networks } from '@btc-vision/bitcoin';
import {
  EcKeyPair,
  Address,
  QuantumBIP32Factory,
  QuantumDerivationPath,
} from '@btc-vision/transaction';
import { JSONRpcProvider, getContract, OP_20_ABI } from 'opnet';

// ── Config ──────────────────────────────────────────────────────────
const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const MNEMONIC = process.env.MNEMONIC || 'section middle cake piano brand doctor marine private pass easily immense sun';
const EC_PATH = "m/86'/0'/0'/0/0";

const MOTO_HEX = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const OPAI_HEX = '0xf7351c9eb78fb4c2098e9c8830fea503245a83fc84db171f3531b4dd3aa78196';

const INVEST_AMOUNT = 10n * 10n ** 18n; // 10 MOTO

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

// ── ABI for IndexToken ──────────────────────────────────────────────
import { BitcoinAbiTypes } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

const INDEX_ABI = [
  ...OP_20_ABI,
  {
    name: 'invest',
    inputs: [
      { name: 'motoAmount', type: ABIDataTypes.UINT256 },
      { name: 'minSharesOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [{ name: 'sharesMinted', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'redeem',
    inputs: [
      { name: 'shareAmount', type: ABIDataTypes.UINT256 },
      { name: 'minMotoOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [{ name: 'motoReturned', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
];

// ── Wait helper ─────────────────────────────────────────────────────
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
let rpcId = 0;

async function rawRpc(method: string, params: unknown[]): Promise<any> {
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  const json = await resp.json() as any;
  return json.result;
}

async function waitForBlock(fromBlock: number, maxWait = 300): Promise<number> {
  const start = Date.now();
  while ((Date.now() - start) < maxWait * 1000) {
    const hex = await rawRpc('btc_blockNumber', []) as string;
    const current = parseInt(hex, 16);
    if (current > fromBlock) return current;
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timed out waiting for new block');
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('=== E2E Invest/Redeem Test ===\n');

  const { signer, mldsaSigner, p2tr } = deriveWallet();
  console.log('Deployer P2TR:', p2tr);

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  // Derive sender Address (hashed MLDSA + tweaked pubkey)
  const senderAddress = EcKeyPair.getSenderAddress(signer, mldsaSigner, NETWORK);
  console.log('Sender address:', senderAddress.toString());

  const motoAddr = Address.fromString(MOTO_HEX);
  const opaiAddr = Address.fromString(OPAI_HEX);

  // Step 0: Check MOTO balance
  const motoContract = getContract(motoAddr, OP_20_ABI, provider, NETWORK, senderAddress);
  console.log('\n--- Step 0: Check MOTO balance ---');
  const balResult = await (motoContract as any).balanceOf(senderAddress);
  const motoBal = balResult?.properties?.balance ?? 0n;
  console.log('MOTO balance:', motoBal.toString(), `(${Number(motoBal) / 1e18} MOTO)`);

  if (motoBal < INVEST_AMOUNT) {
    console.error('Insufficient MOTO! Need', Number(INVEST_AMOUNT) / 1e18, 'have', Number(motoBal) / 1e18);
    return;
  }

  // Step 1: Approve OPAI contract to spend MOTO
  console.log('\n--- Step 1: Approve MOTO spending ---');
  const allowanceResult = await (motoContract as any).allowance(senderAddress, opaiAddr);
  const currentAllowance = allowanceResult?.properties?.remaining ?? 0n;
  console.log('Current allowance:', currentAllowance.toString());

  if (currentAllowance < INVEST_AMOUNT) {
    console.log('Sending increaseAllowance...');
    const approveSim = await (motoContract as any).increaseAllowance(opaiAddr, INVEST_AMOUNT);
    if (approveSim.revert) {
      console.error('Approval simulation REVERTED:', approveSim.revert);
      return;
    }
    console.log('Approval simulation passed. Broadcasting...');
    const approveReceipt = await approveSim.sendTransaction({
      signer,
      mldsaSigner,
      refundTo: p2tr,
      maximumAllowedSatToSpend: 100_000n,
      network: NETWORK,
    });
    console.log('Approval TX:', approveReceipt?.transactionId || 'no txid');

    // Wait for confirmation
    const blockHex = await rawRpc('btc_blockNumber', []) as string;
    const currentBlock = parseInt(blockHex, 16);
    console.log('Waiting for next block (current:', currentBlock, ')...');
    const newBlock = await waitForBlock(currentBlock);
    console.log('New block:', newBlock);
  } else {
    console.log('Allowance already sufficient, skipping approval.');
  }

  // Step 2: Invest
  console.log('\n--- Step 2: Invest', Number(INVEST_AMOUNT) / 1e18, 'MOTO ---');
  const indexContract = getContract(opaiAddr, INDEX_ABI, provider, NETWORK, senderAddress);
  const investSim = await (indexContract as any).invest(INVEST_AMOUNT, 0n);

  if (investSim.revert) {
    console.error('INVEST SIMULATION REVERTED:', investSim.revert);
    console.error('Full result:', JSON.stringify(investSim, null, 2));
    return;
  }

  console.log('Invest simulation PASSED!');
  console.log('Properties:', investSim.properties);
  console.log('Broadcasting...');

  const investReceipt = await investSim.sendTransaction({
    signer,
    mldsaSigner,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  });
  console.log('Invest TX:', investReceipt?.transactionId || 'no txid');

  // Wait for confirmation
  const blockHex2 = await rawRpc('btc_blockNumber', []) as string;
  const block2 = parseInt(blockHex2, 16);
  console.log('Waiting for confirmation...');
  const newBlock2 = await waitForBlock(block2);
  console.log('Confirmed at block:', newBlock2);

  // Step 3: Check results
  console.log('\n--- Step 3: Verify ---');
  const opaiContract = getContract(opaiAddr, INDEX_ABI, provider, NETWORK, senderAddress);
  const shareBal = await (opaiContract as any).balanceOf(senderAddress);
  console.log('OPAI shares:', (shareBal?.properties?.balance ?? 0n).toString());

  const newMotoBal = await (motoContract as any).balanceOf(senderAddress);
  console.log('MOTO after invest:', (newMotoBal?.properties?.balance ?? 0n).toString());

  console.log('\n=== TEST COMPLETE ===');
}

main().catch(err => {
  console.error('\nFATAL:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

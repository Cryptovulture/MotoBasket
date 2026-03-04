/**
 * E2E test: TX-chained approve + invest into OPAI index
 * Uses Mnemonic class + proper Address construction with legacy key
 *
 * Usage: node test-invest-chain.mjs
 */
import { Mnemonic, AddressTypes, Address } from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, crypto as btcCrypto } from '@btc-vision/bitcoin';
import { JSONRpcProvider, getContract, OP_20_ABI, BitcoinAbiTypes } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

// ── Config ──────────────────────────────────────────────────
const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const WORDS = 'section middle cake piano brand doctor marine private pass easily immense sun';

const MOTO_HEX = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const OPAI_HEX = '0xf7351c9eb78fb4c2098e9c8830fea503245a83fc84db171f3531b4dd3aa78196';
const INVEST_AMOUNT = 10n * 10n ** 18n; // 10 MOTO

// ABI with empty outputs for invest/redeem (OPNet simulation returns 1-byte result, SDK can't decode uint256)
const INDEX_ABI = [
  ...OP_20_ABI,
  {
    name: 'invest',
    inputs: [
      { name: 'motoAmount', type: ABIDataTypes.UINT256 },
      { name: 'minSharesOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'redeem',
    inputs: [
      { name: 'shareAmount', type: ABIDataTypes.UINT256 },
      { name: 'minMotoOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
];

// ── Wallet ──────────────────────────────────────────────────
function deriveWallet() {
  const m = new Mnemonic(WORDS, '', NETWORK, MLDSASecurityLevel.LEVEL2);
  const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);

  // Build Address with legacy key (required for transferFrom simulation)
  const mldsaPub = wallet.mldsaKeypair.publicKey;
  const mldsaHash = Buffer.from(btcCrypto.sha256(Buffer.from(mldsaPub))).toString('hex');
  const ecPubHex = Buffer.from(wallet.keypair.publicKey).toString('hex');
  const senderAddress = Address.fromString(mldsaHash, ecPubHex);

  return {
    keypair: wallet.keypair,
    mldsaKeypair: wallet.mldsaKeypair,
    p2tr: wallet.p2tr,
    senderAddress,
  };
}

// ── Helpers ─────────────────────────────────────────────────
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
let rpcId = 0;

async function rawRpc(method, params) {
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  const json = await resp.json();
  return json.result;
}

async function getBlockNumber() {
  const hex = await rawRpc('btc_blockNumber', []);
  return parseInt(hex, 16);
}

async function waitForBlock(fromBlock, maxWaitSec = 300) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSec * 1000) {
    const current = await getBlockNumber();
    if (current > fromBlock) return current;
    process.stdout.write(`\r  Waiting... block ${current} (need > ${fromBlock})`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timed out waiting for new block');
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('=== E2E Invest Test (with TX chaining) ===\n');

  const { keypair, mldsaKeypair, p2tr, senderAddress } = deriveWallet();
  console.log('P2TR:', p2tr);
  console.log('Sender:', senderAddress.toString());
  console.log('Legacy key:', senderAddress.legacyPublicKey ? 'present' : 'MISSING');

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  // Step 0: Check MOTO balance
  const motoContract = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
  const balResult = await motoContract.balanceOf(senderAddress);
  const motoBal = balResult?.properties?.balance ?? 0n;
  console.log('\nMOTO balance:', (Number(motoBal) / 1e18).toFixed(4), 'MOTO');

  if (motoBal < INVEST_AMOUNT) {
    console.error('Insufficient MOTO! Need', Number(INVEST_AMOUNT) / 1e18);
    return;
  }

  // Step 1: Check current allowance
  console.log('\n--- Step 1: Check allowance ---');
  const opaiAddr = Address.fromString(OPAI_HEX);
  let needsApproval = true;

  try {
    const allowResult = await motoContract.allowance(senderAddress, opaiAddr);
    const current = allowResult?.properties?.remaining ?? 0n;
    console.log('Current allowance:', (Number(current) / 1e18).toFixed(4), 'MOTO');
    if (current >= INVEST_AMOUNT) {
      needsApproval = false;
      console.log('Allowance sufficient.');
    }
  } catch (e) {
    console.log('Allowance check failed:', e.message);
  }

  let approveNewUTXOs;

  if (needsApproval) {
    // TX1: Approve
    console.log('\n--- Step 2a: Approve ---');
    const approveSim = await motoContract.approve(opaiAddr, INVEST_AMOUNT);
    if (approveSim.revert) {
      console.error('APPROVE REVERTED:', approveSim.revert);
      return;
    }
    console.log('Approve simulation passed. Broadcasting...');

    const approveReceipt = await approveSim.sendTransaction({
      signer: keypair,
      mldsaSigner: mldsaKeypair,
      refundTo: p2tr,
      maximumAllowedSatToSpend: 100_000n,
      network: NETWORK,
    });

    if (!approveReceipt?.transactionId) {
      console.error('Approve failed:', JSON.stringify(approveReceipt, null, 2));
      return;
    }
    console.log('Approve TX:', approveReceipt.transactionId);
    approveNewUTXOs = approveReceipt.newUTXOs;
    console.log('UTXOs for chaining:', approveNewUTXOs?.length ?? 0);
  }

  // TX2: Invest (chained if approve was needed)
  console.log('\n--- Step 2b: Invest', Number(INVEST_AMOUNT) / 1e18, 'MOTO ---');
  const indexContract = getContract(OPAI_HEX, INDEX_ABI, provider, NETWORK, senderAddress);

  if (approveNewUTXOs) {
    console.log('Setting TX details for chaining...');
    indexContract.setTransactionDetails({ inputs: [], outputs: [] });
  }

  console.log('Simulating invest...');
  const investSim = await indexContract.invest(INVEST_AMOUNT, 0n);

  if (investSim.revert) {
    console.error('INVEST REVERTED:', investSim.revert);

    if (approveNewUTXOs && investSim.revert.includes('allowance')) {
      console.log('\nTX chaining state forward failed. Falling back to block wait...');
      const block = await getBlockNumber();
      console.log('Current block:', block);
      const newBlock = await waitForBlock(block);
      console.log('\nBlock:', newBlock);

      // Retry invest
      const idx2 = getContract(OPAI_HEX, INDEX_ABI, provider, NETWORK, senderAddress);
      const sim2 = await idx2.invest(INVEST_AMOUNT, 0n);
      if (sim2.revert) {
        console.error('STILL REVERTS:', sim2.revert);
        return;
      }
      console.log('Invest sim passed (after block wait). Broadcasting...');

      const receipt2 = await sim2.sendTransaction({
        signer: keypair,
        mldsaSigner: mldsaKeypair,
        refundTo: p2tr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
      });
      console.log('Invest TX:', receipt2?.transactionId || 'FAILED');
    }
    return;
  }

  console.log('Invest simulation PASSED! Gas:', investSim.estimatedGas?.toString());
  console.log('Broadcasting invest TX...');

  const sendOpts = {
    signer: keypair,
    mldsaSigner: mldsaKeypair,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  };

  if (approveNewUTXOs) {
    sendOpts.utxos = approveNewUTXOs;
  }

  const investReceipt = await investSim.sendTransaction(sendOpts);
  const investTxId = investReceipt?.transactionId;
  console.log('Invest TX:', investTxId || 'FAILED');

  if (!investTxId) {
    console.error('Full receipt:', JSON.stringify(investReceipt, null, 2));
    return;
  }

  // Step 3: Wait and verify
  console.log('\n--- Step 3: Wait for confirmation ---');
  const blockNow = await getBlockNumber();
  console.log('Current block:', blockNow);
  const confirmed = await waitForBlock(blockNow);
  console.log('\nConfirmed at block:', confirmed);

  // Check shares
  const opaiContract = getContract(OPAI_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
  const shareResult = await opaiContract.balanceOf(senderAddress);
  const shares = shareResult?.properties?.balance ?? 0n;
  console.log('\nOPAI shares:', (Number(shares) / 1e18).toFixed(6));

  const newBal = await motoContract.balanceOf(senderAddress);
  const newMotoBal = newBal?.properties?.balance ?? 0n;
  console.log('MOTO remaining:', (Number(newMotoBal) / 1e18).toFixed(4));
  console.log('MOTO spent:', ((Number(motoBal) - Number(newMotoBal)) / 1e18).toFixed(4));

  if (shares > 0n) {
    console.log('\n*** INVEST SUCCESSFUL ***');
  } else {
    console.log('\n*** WARNING: 0 shares — TX may not have been included ***');
  }

  console.log('\n=== TEST COMPLETE ===');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

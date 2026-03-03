/**
 * E2E test: Optimized IndexToken V13 — approve + invest + redeem
 * Tests the new contract with token0() call elimination + first-invest optimization
 *
 * Usage: node test-invest-v13.mjs [CONTRACT_HEX]
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
const DEFAULT_INDEX = '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8';
const INDEX_HEX = process.argv[2] || DEFAULT_INDEX;

const INVEST_AMOUNT = 10n * 10n ** 18n; // 10 MOTO (minimum)

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
  {
    name: 'getComponentCount',
    constant: true,
    inputs: [],
    outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getHolding',
    constant: true,
    inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
    outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
];

// ── Wallet ──────────────────────────────────────────────────
function deriveWallet() {
  const m = new Mnemonic(WORDS, '', NETWORK, MLDSASecurityLevel.LEVEL2);
  const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);

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

// ── RPC helpers ─────────────────────────────────────────────
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
let rpcId = 0;
async function rawRpc(method, params) {
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  return (await resp.json()).result;
}

async function getBlockNumber() {
  const hex = await rawRpc('btc_blockNumber', []);
  return parseInt(hex, 16);
}

async function waitForBlock(fromBlock, maxWaitSec = 600) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSec * 1000) {
    const current = await getBlockNumber();
    if (current > fromBlock) return current;
    process.stdout.write(`\r  Waiting... block ${current} (need > ${fromBlock})  `);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timed out waiting for new block');
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('=== E2E Invest+Redeem Test (V13 Optimized) ===\n');
  console.log('Index contract:', INDEX_HEX);

  const { keypair, mldsaKeypair, p2tr, senderAddress } = deriveWallet();
  console.log('P2TR:', p2tr);
  console.log('Sender:', senderAddress.toString());

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
  const sendOpts = {
    signer: keypair,
    mldsaSigner: mldsaKeypair,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  };

  // ── Step 0: Verify contract + MOTO balance ──
  const motoContract = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
  const balResult = await motoContract.balanceOf(senderAddress);
  const motoBal = balResult?.properties?.balance ?? 0n;
  console.log('\nMOTO balance:', (Number(motoBal) / 1e18).toFixed(4));

  if (motoBal < INVEST_AMOUNT) {
    console.error('Insufficient MOTO! Need', Number(INVEST_AMOUNT) / 1e18);
    return;
  }

  // Verify index contract exists
  const indexContract = getContract(INDEX_HEX, INDEX_ABI, provider, NETWORK, senderAddress);
  try {
    const countResult = await indexContract.getComponentCount();
    const count = countResult?.properties?.count ?? 0n;
    console.log('Component count:', count.toString());
    if (count === 0n) {
      console.error('Contract not found or no components!');
      return;
    }
  } catch (e) {
    console.error('Failed to read contract:', e.message);
    return;
  }

  // Check totalSupply
  const supplyResult = await indexContract.totalSupply();
  const currentSupply = supplyResult?.properties?.totalSupply ?? 0n;
  console.log('Current total supply:', (Number(currentSupply) / 1e18).toFixed(6));

  // ── Step 1: Approve MOTO ──
  console.log('\n--- Step 1: Approve MOTO ---');
  const indexAddr = Address.fromString(INDEX_HEX);

  let needsApproval = true;
  try {
    const allowResult = await motoContract.allowance(senderAddress, indexAddr);
    const current = allowResult?.properties?.remaining ?? 0n;
    console.log('Current allowance:', (Number(current) / 1e18).toFixed(4));
    if (current >= INVEST_AMOUNT) {
      needsApproval = false;
    }
  } catch (_) {}

  if (needsApproval) {
    const approveSim = await motoContract.increaseAllowance(indexAddr, INVEST_AMOUNT);
    if (approveSim.revert) {
      console.error('APPROVE REVERTED:', approveSim.revert);
      return;
    }
    console.log('Approve sim passed. Broadcasting...');
    const approveReceipt = await approveSim.sendTransaction(sendOpts);
    if (!approveReceipt?.transactionId) {
      console.error('Approve TX failed');
      return;
    }
    console.log('Approve TX:', approveReceipt.transactionId);

    // Wait for confirmation
    const block = await getBlockNumber();
    console.log('Waiting for approve to confirm...');
    await waitForBlock(block);
    console.log('\nApprove confirmed.');
  }

  // ── Step 2: Invest ──
  console.log('\n--- Step 2: Invest', Number(INVEST_AMOUNT) / 1e18, 'MOTO ---');

  // Fresh contract instance after potential block wait
  const idx2 = getContract(INDEX_HEX, INDEX_ABI, provider, NETWORK, senderAddress);
  console.log('Simulating invest...');
  const investSim = await idx2.invest(INVEST_AMOUNT, 0n);

  if (investSim.revert) {
    console.error('INVEST REVERTED:', investSim.revert);
    return;
  }

  // Check result bytes
  const resultBytes = investSim.calldata?.length ?? -1;
  console.log('Simulation result bytes:', resultBytes);
  console.log('Gas estimate:', investSim.estimatedGas?.toString());

  // Check for 1-byte 0x00 failure (the silent VM abort pattern)
  const rawResult = investSim.calldata;
  if (rawResult && rawResult.length === 1) {
    console.error('*** 1-BYTE RESULT DETECTED ***');
    console.error('This is the silent VM abort pattern. The optimization may not be enough.');
    console.error('Raw byte:', rawResult[0]);
    return;
  }

  console.log('Simulation PASSED! Broadcasting...');
  const investReceipt = await investSim.sendTransaction(sendOpts);
  const investTxId = investReceipt?.transactionId;
  console.log('Invest TX:', investTxId || 'FAILED');

  if (!investTxId) {
    console.error('Full receipt:', JSON.stringify(investReceipt, null, 2));
    return;
  }

  // Wait for confirmation
  const investBlock = await getBlockNumber();
  console.log('Waiting for invest to confirm...');
  await waitForBlock(investBlock);

  // ── Step 3: Verify shares ──
  console.log('\n--- Step 3: Verify ---');
  const idx3 = getContract(INDEX_HEX, INDEX_ABI, provider, NETWORK, senderAddress);
  const shareResult = await idx3.balanceOf(senderAddress);
  const shares = shareResult?.properties?.balance ?? 0n;
  console.log('Index shares:', (Number(shares) / 1e18).toFixed(6));

  const newMotoBal = (await motoContract.balanceOf(senderAddress))?.properties?.balance ?? 0n;
  console.log('MOTO remaining:', (Number(newMotoBal) / 1e18).toFixed(4));
  console.log('MOTO spent:', ((Number(motoBal) - Number(newMotoBal)) / 1e18).toFixed(4));

  if (shares === 0n) {
    console.error('\n*** INVEST FAILED: 0 shares ***');
    return;
  }
  console.log('\n*** INVEST SUCCEEDED ***');

  // ── Step 4: Redeem ──
  console.log('\n--- Step 4: Redeem ALL shares ---');
  const redeemSim = await idx3.redeem(shares, 0n);
  if (redeemSim.revert) {
    console.error('REDEEM REVERTED:', redeemSim.revert);
    return;
  }

  const redeemResultBytes = redeemSim.calldata?.length ?? -1;
  console.log('Redeem sim result bytes:', redeemResultBytes);
  if (redeemSim.calldata && redeemSim.calldata.length === 1) {
    console.error('*** 1-BYTE RESULT (silent VM abort) ***');
    return;
  }

  console.log('Redeem sim PASSED! Broadcasting...');
  const redeemReceipt = await redeemSim.sendTransaction(sendOpts);
  const redeemTxId = redeemReceipt?.transactionId;
  console.log('Redeem TX:', redeemTxId || 'FAILED');

  if (!redeemTxId) {
    console.error('Full receipt:', JSON.stringify(redeemReceipt, null, 2));
    return;
  }

  // Wait for confirmation
  const redeemBlock = await getBlockNumber();
  console.log('Waiting for redeem to confirm...');
  await waitForBlock(redeemBlock);

  // Final verification
  console.log('\n--- Final State ---');
  const finalShares = (await idx3.balanceOf(senderAddress))?.properties?.balance ?? 0n;
  const finalMoto = (await motoContract.balanceOf(senderAddress))?.properties?.balance ?? 0n;
  console.log('Shares remaining:', (Number(finalShares) / 1e18).toFixed(6));
  console.log('MOTO balance:', (Number(finalMoto) / 1e18).toFixed(4));
  console.log('MOTO net change:', ((Number(finalMoto) - Number(motoBal)) / 1e18).toFixed(4));

  if (finalShares === 0n && finalMoto > newMotoBal) {
    console.log('\n*** FULL CYCLE SUCCESS: Invest + Redeem both worked ***');
  } else if (finalShares === 0n) {
    console.log('\n*** REDEEM completed but MOTO not returned (check swap reverts) ***');
  }

  console.log('\n=== TEST COMPLETE ===');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

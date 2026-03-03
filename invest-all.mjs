/**
 * Invest in all 10 indexes sequentially.
 * Phase 1: Approve MOTO for all indexes (back-to-back, UTXO chaining)
 * Phase 2: Wait for block confirmation
 * Phase 3: Invest in each index (back-to-back)
 * Phase 4: Wait for block, verify
 */
import { Mnemonic, AddressTypes, Address } from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, crypto as btcCrypto } from '@btc-vision/bitcoin';
import { JSONRpcProvider, getContract, OP_20_ABI, BitcoinAbiTypes } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
const WORDS = 'section middle cake piano brand doctor marine private pass easily immense sun';

const MOTO_HEX = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

const INVEST_AMOUNT = 50n * 10n ** 18n; // 50 MOTO per index
const APPROVE_AMOUNT = 200n * 10n ** 18n; // approve extra for future use

const INDEXES = [
  { symbol: 'OPAI', addr: '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8' },
  { symbol: 'OPMEME', addr: '0x2f8c7fb147949a5bc95f6832a1c1ae7446ced4c5a3a7b3270160a3dc5a5836dd' },
  { symbol: 'OPDEFI', addr: '0xae2575d734f9e6dcba8d2dc8534497b0eed4d563b4ef6360075b2a135400eead' },
  { symbol: 'OPGAME', addr: '0x0e1a2cc9f3c32c6ed08a50f5fa9f0c6fa13624e44d15f932c453c2801e57815c' },
  { symbol: 'OPINFRA', addr: '0xcc5a01846610a268856b0677ad0550a42f9d81fe04ed757fc39595bd6965bf2c' },
  { symbol: 'ANSEM', addr: '0x024379a677871f98836b91eeed15468c2213d7ef3df1e1dbd9303739c9edb5b7' },
  { symbol: 'CHAD', addr: '0xc2d24557a1237cced807b9deb531627a4ac4884063891f63967f093b85c67c65' },
  { symbol: 'DANNY', addr: '0xf1c011543071351c09380fac3fd7844c383ead53d68c9206fdc1bf77029534fe' },
  { symbol: 'GCR', addr: '0xf1f84e8794a03e66274fee486fb3602f7b88ae78e725401e5ef17bd75e621a0a' },
  { symbol: 'VULTURE', addr: '0x03e9be2c2f770cb643021f06bbfa6c32baf6514daf5dfc0bad4099ed854a44ad' },
];

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
];

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
  return parseInt(await rawRpc('btc_blockNumber', []), 16);
}

async function waitForBlock(fromBlock, maxSec = 900) {
  const start = Date.now();
  while (Date.now() - start < maxSec * 1000) {
    const current = await getBlockNumber();
    if (current > fromBlock) return current;
    process.stdout.write(`\r  Block ${current} (need > ${fromBlock}) — waiting...  `);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timed out waiting for block');
}

async function main() {
  console.log('=== Invest in All 10 Indexes ===\n');

  const { keypair, mldsaKeypair, p2tr, senderAddress } = deriveWallet();
  console.log('Wallet:', p2tr);

  const sendOpts = {
    signer: keypair,
    mldsaSigner: mldsaKeypair,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  };

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  // ── Phase 1: Check allowances and approve where needed ──
  console.log('\n=== Phase 1: Approve MOTO for all indexes ===\n');

  const motoContract = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
  const needsApproval = [];

  for (const idx of INDEXES) {
    const spender = Address.fromString(idx.addr);
    try {
      const res = await motoContract.allowance(senderAddress, spender);
      const current = res?.properties?.remaining ?? 0n;
      if (current < INVEST_AMOUNT) {
        needsApproval.push(idx);
        console.log(`  ${idx.symbol}: allowance ${(Number(current)/1e18).toFixed(0)} — NEEDS APPROVE`);
      } else {
        console.log(`  ${idx.symbol}: allowance ${(Number(current)/1e18).toFixed(0)} — OK`);
      }
    } catch {
      needsApproval.push(idx);
      console.log(`  ${idx.symbol}: check failed — NEEDS APPROVE`);
    }
  }

  if (needsApproval.length > 0) {
    console.log(`\nApproving ${needsApproval.length} indexes...`);

    for (const idx of needsApproval) {
      const spender = Address.fromString(idx.addr);
      // Fresh contract instance each time so the SDK picks up latest UTXOs
      const moto = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
      try {
        const sim = await moto.increaseAllowance(spender, APPROVE_AMOUNT);
        if (sim.revert) {
          console.log(`  ${idx.symbol} APPROVE REVERTED: ${sim.revert}`);
          continue;
        }
        const receipt = await sim.sendTransaction(sendOpts);
        const txId = receipt?.transactionId;
        console.log(`  ${idx.symbol} approve TX: ${txId ? txId.substring(0, 16) + '...' : 'FAILED'}`);
        if (!txId) continue;
        // Small delay to let UTXO propagate
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.log(`  ${idx.symbol} approve ERROR: ${e.message?.substring(0, 60)}`);
      }
    }

    // Wait for block confirmation
    const block = await getBlockNumber();
    console.log(`\nWaiting for approves to confirm (block ${block})...`);
    const newBlock = await waitForBlock(block);
    console.log(`\nApproves confirmed at block ${newBlock}`);
  } else {
    console.log('\nAll allowances sufficient, skipping approvals.');
  }

  // ── Phase 2: Invest in all indexes ──
  console.log('\n=== Phase 2: Invest in all indexes ===\n');

  const investResults = [];

  for (const idx of INDEXES) {
    const idxContract = getContract(idx.addr, INDEX_ABI, provider, NETWORK, senderAddress);
    try {
      console.log(`  ${idx.symbol}: simulating invest ${Number(INVEST_AMOUNT)/1e18} MOTO...`);
      const sim = await idxContract.invest(INVEST_AMOUNT, 0n);

      if (sim.revert) {
        console.log(`  ${idx.symbol} INVEST REVERTED: ${sim.revert}`);
        investResults.push({ symbol: idx.symbol, status: 'reverted', reason: sim.revert });
        continue;
      }

      // Check for 1-byte abort
      if (sim.calldata && sim.calldata.length === 1) {
        console.log(`  ${idx.symbol} SILENT VM ABORT (1-byte result)`);
        investResults.push({ symbol: idx.symbol, status: 'vm_abort' });
        continue;
      }

      console.log(`  ${idx.symbol}: sim passed (gas: ${sim.estimatedGas}), broadcasting...`);
      const receipt = await sim.sendTransaction(sendOpts);
      const txId = receipt?.transactionId;
      console.log(`  ${idx.symbol} invest TX: ${txId ? txId.substring(0, 16) + '...' : 'FAILED'}`);
      investResults.push({ symbol: idx.symbol, status: txId ? 'broadcast' : 'failed', txId });

      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  ${idx.symbol} invest ERROR: ${e.message?.substring(0, 80)}`);
      investResults.push({ symbol: idx.symbol, status: 'error', reason: e.message?.substring(0, 80) });
    }
  }

  // Wait for invest confirmations
  const investBlock = await getBlockNumber();
  console.log(`\nWaiting for invests to confirm (block ${investBlock})...`);
  const finalBlock = await waitForBlock(investBlock);
  console.log(`\nInvests confirmed at block ${finalBlock}`);

  // ── Phase 3: Verify ──
  console.log('\n=== Phase 3: Verify positions ===\n');

  for (const idx of INDEXES) {
    const c = getContract(idx.addr, INDEX_ABI, provider, NETWORK, senderAddress);
    try {
      const shareBal = await c.balanceOf(senderAddress);
      const shares = shareBal?.properties?.balance ?? 0n;
      const supplyRes = await c.totalSupply();
      const supply = supplyRes?.properties?.totalSupply ?? 0n;
      const status = shares > 0n ? 'OK' : 'EMPTY';
      console.log(`  ${idx.symbol.padEnd(8)} shares: ${(Number(shares)/1e18).toFixed(2).padStart(10)}  supply: ${(Number(supply)/1e18).toFixed(2).padStart(10)}  ${status}`);
    } catch (e) {
      console.log(`  ${idx.symbol.padEnd(8)} ERROR: ${e.message?.substring(0, 60)}`);
    }
  }

  // Final MOTO balance
  const finalBal = await motoContract.balanceOf(senderAddress);
  const finalMoto = finalBal?.properties?.balance ?? 0n;
  console.log(`\nMOTO remaining: ${(Number(finalMoto)/1e18).toFixed(2)}`);

  console.log('\n=== COMPLETE ===');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

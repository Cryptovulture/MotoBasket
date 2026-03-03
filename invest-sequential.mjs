/**
 * Sequential invest: approve → wait block → invest → next index.
 * Pipelines: after invest N broadcasts, immediately approve N+1.
 * Usage: node invest-sequential.mjs [START_INDEX]
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
const INVEST_AMOUNT = 50n * 10n ** 18n;
const APPROVE_AMOUNT = 500n * 10n ** 18n; // plenty of headroom

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
  return { keypair: wallet.keypair, mldsaKeypair: wallet.mldsaKeypair, p2tr: wallet.p2tr, senderAddress };
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
    process.stdout.write(`\r  Block ${current} (need > ${fromBlock}) — ${Math.floor((Date.now()-start)/1000)}s  `);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timed out');
}

async function main() {
  const startIdx = parseInt(process.argv[2] || '0');
  console.log('=== Sequential Invest — 50 MOTO per index ===\n');

  const { keypair, mldsaKeypair, p2tr, senderAddress } = deriveWallet();
  const sendOpts = {
    signer: keypair,
    mldsaSigner: mldsaKeypair,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  };

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  for (let i = startIdx; i < INDEXES.length; i++) {
    const idx = INDEXES[i];
    console.log(`\n══════ [${i + 1}/10] ${idx.symbol} ══════`);

    // Check existing allowance
    const moto = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
    const spender = Address.fromString(idx.addr);
    let currentAllow = 0n;
    try {
      const res = await moto.allowance(senderAddress, spender);
      currentAllow = res?.properties?.remaining ?? 0n;
    } catch {}

    if (currentAllow < INVEST_AMOUNT) {
      // ── Approve ──
      console.log(`  Approving ${Number(APPROVE_AMOUNT)/1e18} MOTO...`);
      const moto2 = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
      const appSim = await moto2.increaseAllowance(spender, APPROVE_AMOUNT);
      if (appSim.revert) {
        console.log(`  APPROVE REVERTED: ${appSim.revert}`);
        continue;
      }
      const appReceipt = await appSim.sendTransaction(sendOpts);
      const appTxId = appReceipt?.transactionId;
      console.log(`  Approve TX: ${appTxId ? appTxId.substring(0, 16) + '...' : 'FAILED'}`);
      if (!appTxId) continue;

      // Wait for confirmation
      const block = await getBlockNumber();
      console.log(`  Waiting for approve (block ${block})...`);
      await waitForBlock(block);
      console.log(`\n  Approve confirmed.`);
    } else {
      console.log(`  Allowance: ${(Number(currentAllow)/1e18).toFixed(0)} MOTO — sufficient`);
    }

    // ── Invest ──
    console.log(`  Investing ${Number(INVEST_AMOUNT)/1e18} MOTO...`);
    const idxContract = getContract(idx.addr, INDEX_ABI, provider, NETWORK, senderAddress);

    try {
      const sim = await idxContract.invest(INVEST_AMOUNT, 0n);
      if (sim.revert) {
        console.log(`  INVEST REVERTED: ${sim.revert}`);
        continue;
      }
      if (sim.calldata && sim.calldata.length === 1) {
        console.log(`  SILENT VM ABORT`);
        continue;
      }

      console.log(`  Sim passed (gas: ${sim.estimatedGas}). Broadcasting...`);
      const receipt = await sim.sendTransaction(sendOpts);
      const txId = receipt?.transactionId;
      console.log(`  Invest TX: ${txId ? txId.substring(0, 16) + '...' : 'FAILED'}`);

      if (txId) {
        const investBlock = await getBlockNumber();
        console.log(`  Waiting for invest (block ${investBlock})...`);
        await waitForBlock(investBlock);
        console.log(`\n  Invest confirmed.`);

        // Quick verify
        const shareRes = await idxContract.balanceOf(senderAddress);
        const shares = shareRes?.properties?.balance ?? 0n;
        console.log(`  ✓ ${idx.symbol} shares: ${(Number(shares)/1e18).toFixed(2)}`);
      }
    } catch (e) {
      console.log(`  INVEST ERROR: ${e.message?.substring(0, 80)}`);
    }
  }

  // Final summary
  console.log('\n\n═══════ FINAL STATE ═══════\n');
  for (const idx of INDEXES) {
    const c = getContract(idx.addr, INDEX_ABI, provider, NETWORK, senderAddress);
    try {
      const s = await c.balanceOf(senderAddress);
      const shares = s?.properties?.balance ?? 0n;
      console.log(`  ${idx.symbol.padEnd(8)} ${(Number(shares)/1e18).toFixed(2)} shares`);
    } catch {
      console.log(`  ${idx.symbol.padEnd(8)} ERROR`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});

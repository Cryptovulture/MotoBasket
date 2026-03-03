/**
 * Invest more MOTO into specific indexes to create price divergence.
 * Uses UTXO chaining.
 *
 * Usage: node invest-more.mjs <MOTO_AMOUNT> <INDEX1> <INDEX2> ...
 *   e.g. node invest-more.mjs 10 OPAI OPMEME ANSEM
 *        node invest-more.mjs 10 ALL
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

const INDEXES = {
  OPAI: '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8',
  OPMEME: '0x2f8c7fb147949a5bc95f6832a1c1ae7446ced4c5a3a7b3270160a3dc5a5836dd',
  OPDEFI: '0xae2575d734f9e6dcba8d2dc8534497b0eed4d563b4ef6360075b2a135400eead',
  OPGAME: '0x0e1a2cc9f3c32c6ed08a50f5fa9f0c6fa13624e44d15f932c453c2801e57815c',
  OPINFRA: '0xcc5a01846610a268856b0677ad0550a42f9d81fe04ed757fc39595bd6965bf2c',
  ANSEM: '0x024379a677871f98836b91eeed15468c2213d7ef3df1e1dbd9303739c9edb5b7',
  CHAD: '0xc2d24557a1237cced807b9deb531627a4ac4884063891f63967f093b85c67c65',
  DANNY: '0xf1c011543071351c09380fac3fd7844c383ead53d68c9206fdc1bf77029534fe',
  GCR: '0xf1f84e8794a03e66274fee486fb3602f7b88ae78e725401e5ef17bd75e621a0a',
  VULTURE: '0x03e9be2c2f770cb643021f06bbfa6c32baf6514daf5dfc0bad4099ed854a44ad',
};

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
    method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    process.stdout.write(`\r  Block ${current} — ${Math.floor((Date.now()-start)/1000)}s  `);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timed out');
}

async function main() {
  const motoPerIndex = BigInt(process.argv[2] || '10');
  let targetSymbols = process.argv.slice(3).map(s => s.toUpperCase());

  if (targetSymbols.length === 0 || targetSymbols[0] === 'ALL') {
    targetSymbols = Object.keys(INDEXES);
  }

  // Validate
  for (const sym of targetSymbols) {
    if (!INDEXES[sym]) { console.error('Unknown index:', sym); return; }
  }

  const INVEST_AMOUNT = motoPerIndex * 10n ** 18n;
  console.log(`=== Invest ${motoPerIndex} MOTO each into ${targetSymbols.join(', ')} ===\n`);

  const { keypair, mldsaKeypair, p2tr, senderAddress } = deriveWallet();
  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  const baseSendOpts = {
    signer: keypair,
    mldsaSigner: mldsaKeypair,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  };

  let lastUTXOs = undefined;
  let successCount = 0;

  for (let i = 0; i < targetSymbols.length; i++) {
    const sym = targetSymbols[i];
    const addr = INDEXES[sym];
    console.log(`[${i+1}/${targetSymbols.length}] ${sym} — ${motoPerIndex} MOTO...`);

    const idxContract = getContract(addr, INDEX_ABI, provider, NETWORK, senderAddress);

    try {
      const sim = await idxContract.invest(INVEST_AMOUNT, 0n);

      if (sim.revert) {
        console.log(`  REVERTED: ${sim.revert}`);
        continue;
      }
      if (sim.calldata && sim.calldata.length === 1) {
        console.log(`  SILENT VM ABORT`);
        continue;
      }

      console.log(`  Sim OK (gas: ${sim.estimatedGas}). Broadcasting...`);

      const sendOpts = lastUTXOs ? { ...baseSendOpts, utxos: lastUTXOs } : baseSendOpts;
      const receipt = await sim.sendTransaction(sendOpts);
      const txId = receipt?.transactionId;

      if (txId) {
        console.log(`  TX: ${txId.substring(0, 20)}...`);
        lastUTXOs = receipt.newUTXOs;
        successCount++;
      } else {
        console.log(`  BROADCAST FAILED`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message?.substring(0, 100)}`);
    }
  }

  console.log(`\n${successCount}/${targetSymbols.length} invest TXs broadcast.`);

  if (successCount > 0) {
    const block = await getBlockNumber();
    console.log(`Waiting for confirmation (block ${block})...`);
    const newBlock = await waitForBlock(block);
    console.log(`\nConfirmed at block ${newBlock}`);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});

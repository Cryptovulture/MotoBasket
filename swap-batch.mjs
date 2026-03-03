/**
 * Batch swap MOTO for multiple tokens with UTXO chaining.
 * Each swap uses the previous receipt's newUTXOs.
 *
 * Usage: node swap-batch.mjs <MOTO_PER_SWAP> <TOKEN1> <TOKEN2> ...
 *   e.g. node swap-batch.mjs 100 NRNA SYNP CRTX
 */
import { Mnemonic, AddressTypes, Address } from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, crypto as btcCrypto } from '@btc-vision/bitcoin';
import { JSONRpcProvider, getContract, OP_20_ABI, MOTOSWAP_ROUTER_ABI } from 'opnet';

const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
const WORDS = 'section middle cake piano brand doctor marine private pass easily immense sun';

const MOTO_HEX = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const ROUTER_HEX = '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a';

const TOKENS = {
  NRNA: '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f',
  SYNP: '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c',
  CRTX: '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c',
  DPLR: '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7',
  CPHR: '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940',
  PEEP: '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6',
  DGEN: '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22',
  BONQ: '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258',
  SHBA: '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383',
  LNDB: '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18',
  YLDP: '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b',
  SWPX: '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46',
  NEBL: '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04',
  WBTC: '0xceca13106b88822d06f8ff1fea5fbe15a60d361ba494170efb3c7d6025bd209d',
  STSH: '0xc341404b364262579db4b31276a94f76190b3c24847f1aa5744e593f6c2f6018',
  PILL: '0x4332dafd738b89df51e0c75fb8a1d303e6b542b76f014b2daa4f93d5aabc6d53',
  STR8: '0xe7817ac350ece2b586869aced8b3cb70b1a1108fd6798d44fc629bbff355b514',
  MNGO: '0xd489377d4a9a64ccec90996ad4027fb8b824835b875e7d55d864030fdf4c32ce',
  APPL: '0x3f8661627f0d0570f5a3c51be4b80e6e3b5e3e71e1f8f8faa567645987345c27',
  AVDO: '0x1694edcd0df9053bb9fe8b1ccef3057451a08426e888acb9cf2fe9306f0f46fd',
  BERY: '0x3ca2249304ce3ac49c8cadc633f3cc5e02896fc46d30ab44fb91d974ed18f9c1',
};

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
  const motoPerSwap = BigInt(process.argv[2] || '100');
  const tokenSymbols = process.argv.slice(3).map(s => s.toUpperCase());

  if (tokenSymbols.length === 0) {
    console.log('Usage: node swap-batch.mjs <MOTO_PER_SWAP> <TOKEN1> <TOKEN2> ...');
    console.log('Tokens:', Object.keys(TOKENS).join(', '));
    return;
  }

  // Validate
  for (const sym of tokenSymbols) {
    if (!TOKENS[sym]) { console.error('Unknown token:', sym); return; }
  }

  const motoAmount = motoPerSwap * 10n ** 18n;
  console.log(`=== Batch Swap: ${motoPerSwap} MOTO each → ${tokenSymbols.join(', ')} ===\n`);

  const { keypair, mldsaKeypair, p2tr, senderAddress } = deriveWallet();
  const baseSendOpts = {
    signer: keypair,
    mldsaSigner: mldsaKeypair,
    refundTo: p2tr,
    maximumAllowedSatToSpend: 100_000n,
    network: NETWORK,
  };

  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  // Check Router allowance
  const moto = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
  const routerAddr = Address.fromString(ROUTER_HEX);
  const allowRes = await moto.allowance(senderAddress, routerAddr);
  const currentAllow = allowRes?.properties?.remaining ?? 0n;
  const totalNeeded = motoAmount * BigInt(tokenSymbols.length);

  let lastUTXOs = undefined;

  if (currentAllow < totalNeeded) {
    console.log(`Approving ${Number(totalNeeded)/1e18} MOTO for Router...`);
    const moto2 = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
    const appSim = await moto2.increaseAllowance(routerAddr, totalNeeded * 2n);
    if (appSim.revert) { console.error('Approve reverted:', appSim.revert); return; }
    const appReceipt = await appSim.sendTransaction(baseSendOpts);
    console.log('Approve TX:', appReceipt?.transactionId?.substring(0, 16) + '...');
    if (!appReceipt?.transactionId) return;

    const block = await getBlockNumber();
    console.log('Waiting for approve...');
    await waitForBlock(block);
    console.log('\nApprove confirmed.\n');
  } else {
    console.log(`Router allowance: ${(Number(currentAllow)/1e18).toFixed(0)} — sufficient\n`);
  }

  // Batch swap with UTXO chaining
  let successCount = 0;
  for (let i = 0; i < tokenSymbols.length; i++) {
    const sym = tokenSymbols[i];
    const tokenAddr = TOKENS[sym];
    console.log(`[${i+1}/${tokenSymbols.length}] ${motoPerSwap} MOTO → ${sym}...`);

    const router = getContract(ROUTER_HEX, MOTOSWAP_ROUTER_ABI, provider, NETWORK, senderAddress);
    const path = [Address.fromString(MOTO_HEX), Address.fromString(tokenAddr)];

    try {
      const sim = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        motoAmount, 0n, path, senderAddress, deadline,
      );

      if (sim.revert) {
        console.log(`  REVERTED: ${sim.revert}`);
        continue;
      }

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

  console.log(`\n${successCount}/${tokenSymbols.length} swaps broadcast.`);
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
